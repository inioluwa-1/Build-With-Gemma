/**
 * The transport-agnostic core of the Gemma layer.
 *
 * Everything here is safe to import from the browser — no `@google/genai`, no
 * `process.env`. The two transports (the server API in ./client and the
 * in-browser Ollama client in ./ollama) both speak this shape, and the harness
 * validates whatever either returns. Keeping these types out of ./client is
 * what lets the prompt builders and harness run on the client for local mode
 * without dragging the Google SDK into the bundle.
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
   * Gemma reasons before answering unless told not to. None of this app's calls
   * are reasoning problems; they are transcription and paraphrase. "minimal" is
   * the default and "default" is opt-in.
   */
  thinking?: "minimal" | "default";
  signal?: AbortSignal;
}

/**
 * One model call: options in, raw text out. Parsing and validation live in the
 * harness, so a transport only has to produce the model's text. Both the server
 * (Gemini API) and local (Ollama) transports are functions of this type.
 */
export type GenerateFn = (options: GenerateOptions) => Promise<string>;
