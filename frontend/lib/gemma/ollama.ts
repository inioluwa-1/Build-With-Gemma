import { GemmaUnavailableError, type GenerateFn, type GenerateOptions } from "./types";

/**
 * The local transport: Gemma 4 running in the user's own Ollama.
 *
 * This runs in the browser and talks to Ollama directly — the deployed server
 * can't reach a user's localhost, so it has to. That means two things the
 * settings panel has to spell out: Ollama must allow this origin
 * (`OLLAMA_ORIGINS`), and a plain-http host only works for `localhost`
 * (browsers exempt it from the HTTPS mixed-content block; a LAN IP would be
 * blocked).
 *
 * The shape mirrors ./client.generate exactly — same options in, model text
 * out, same GemmaUnavailableError vocabulary — so the harness and every prompt
 * builder are reused unchanged.
 */

export interface OllamaConfig {
  /** Base URL, no trailing slash, e.g. "http://localhost:11434". */
  host: string;
  /** A pulled tag, e.g. "gemma4:e4b". */
  model: string;
}

interface OllamaChatResponse {
  message?: { content?: string };
  error?: string;
}

/** Trim a trailing slash so `${host}/api/...` never doubles up. */
export function normalizeHost(host: string): string {
  return host.trim().replace(/\/+$/, "");
}

export function createOllamaGenerate({ host, model }: OllamaConfig): GenerateFn {
  const base = normalizeHost(host);

  return async ({
    prompt,
    system,
    image,
    temperature = 0,
    maxOutputTokens,
    signal,
  }: GenerateOptions): Promise<string> => {
    const body = {
      model,
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        {
          role: "user",
          content: prompt,
          // Ollama takes raw base64 (no data: prefix), which is exactly how
          // InlineImage carries it. Vision models like gemma4:e4b read it;
          // a PDF would not, so local extraction wants a photo, not a file.
          ...(image ? { images: [image.data] } : {}),
        },
      ],
      stream: false,
      // gemma4 can reason, but these are transcription/paraphrase calls — keep
      // it off so a local run is not needlessly slow.
      think: false,
      options: {
        temperature,
        ...(maxOutputTokens ? { num_predict: maxOutputTokens } : {}),
      },
    };

    let response: Response;
    try {
      response = await fetch(`${base}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });
    } catch (cause) {
      // An abort is not a failure — let it propagate like fetch does, so the
      // caller's cancel/timeout handling still works.
      if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
      // Anything else here is "couldn't reach Ollama": server down, wrong host,
      // or the browser blocked it (CORS / mixed content). All retryable, and
      // the settings panel explains the fixes.
      throw new GemmaUnavailableError(
        "network",
        cause instanceof Error ? cause.message : "Could not reach Ollama",
      );
    }

    if (!response.ok) {
      // 404 is a missing model tag — asking again won't help. Other 5xx might.
      const permanent = response.status === 404 || (response.status >= 400 && response.status < 500);
      throw new GemmaUnavailableError(
        permanent ? "rejected" : "network",
        `Ollama responded ${response.status}`,
        !permanent,
      );
    }

    const data = (await response.json().catch(() => null)) as OllamaChatResponse | null;
    if (data?.error) {
      throw new GemmaUnavailableError("rejected", data.error, false);
    }
    return data?.message?.content ?? "";
  };
}

/**
 * A quick reachability + model check for the settings "Test connection" button.
 * Returns the tags Ollama reports so the panel can confirm the chosen model is
 * actually pulled.
 */
export async function listOllamaModels(host: string, signal?: AbortSignal): Promise<string[]> {
  const response = await fetch(`${normalizeHost(host)}/api/tags`, { signal });
  if (!response.ok) throw new Error(`Ollama responded ${response.status}`);
  const data = (await response.json()) as { models?: Array<{ name?: string }> };
  return (data.models ?? []).map((m) => m.name ?? "").filter(Boolean);
}
