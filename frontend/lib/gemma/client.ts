import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";

/**
 * Thin adapter over Gemma 4 on the Gemini API.
 *
 * Server-side only — the API key must never reach the browser. Import this
 * from route handlers and scripts, never from a component.
 */

export type GemmaErrorKind = "no_api_key" | "network" | "rejected";

export class GemmaUnavailableError extends Error {
  constructor(
    readonly kind: GemmaErrorKind,
    message: string,
    /** True when trying again could plausibly succeed. */
    readonly retryable: boolean = true,
  ) {
    super(message);
    this.name = "GemmaUnavailableError";
  }
}

export interface InlineImage {
  mimeType: string;
  /** Base64 payload without the `data:` URL prefix. */
  data: string;
}

export interface GenerateOptions {
  prompt: string;
  system?: string;
  image?: InlineImage;
  /** Extraction and verdict explanation both want determinism, not flair. */
  temperature?: number;
  maxOutputTokens?: number;
  /**
   * Gemma 4 reasons before answering unless told not to. Measured on a bill
   * photo: 41.1s with the default budget, 2.3s with MINIMAL — for identical
   * extractions. None of this app's calls are reasoning problems; they are
   * transcription and paraphrase. MINIMAL is the default and "default" is
   * opt-in. (`thinkingBudget: 0` is rejected by these models — use the level.)
   */
  thinking?: "minimal" | "default";
  signal?: AbortSignal;
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new GemmaUnavailableError(
      "no_api_key",
      "GOOGLE_API_KEY is not set. Copy .env.example to .env.local and add a Google AI Studio key.",
    );
  }
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

export function modelName(): string {
  return process.env.GEMMA_MODEL || "gemma-4-31b-it";
}

export function hasApiKey(): boolean {
  return Boolean(process.env.GOOGLE_API_KEY);
}

/** One call. Returns the model's raw text; parsing and validation live in the harness. */
export async function generate({
  prompt,
  system,
  image,
  temperature = 0,
  maxOutputTokens,
  thinking = "minimal",
  signal,
}: GenerateOptions): Promise<string> {
  const ai = getClient();

  const parts: Array<{ text: string } | { inlineData: InlineImage }> = [];
  if (image) parts.push({ inlineData: image });
  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: modelName(),
      contents: [{ role: "user", parts }],
      config: {
        ...(system ? { systemInstruction: system } : {}),
        temperature,
        ...(thinking === "minimal"
          ? { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } }
          : {}),
        ...(maxOutputTokens ? { maxOutputTokens } : {}),
        ...(signal ? { abortSignal: signal } : {}),
      },
    });
    // Gemma returns its reasoning as extra parts flagged `thought: true`.
    // Those must never reach the JSON parser, so take the answer parts only
    // and fall back to `.text` if the shape is ever different.
    const answer = (response.candidates?.[0]?.content?.parts ?? [])
      .filter((part) => !part.thought && typeof part.text === "string")
      .map((part) => part.text)
      .join("");
    return answer || response.text || "";
  } catch (cause) {
    const status = cause instanceof ApiError ? cause.status : undefined;
    // A 4xx is the API telling us the request itself is wrong — an unsupported
    // file, too many pages, a bad key. Sending it again unchanged just burns
    // the user's time; 429 is the exception, since rate limits do clear.
    // Anything else (5xx, dropped connection) is worth another attempt.
    const permanent = status !== undefined && status >= 400 && status < 500 && status !== 429;
    throw new GemmaUnavailableError(
      permanent ? "rejected" : "network",
      cause instanceof Error ? cause.message : "Gemma request failed",
      !permanent,
    );
  }
}
