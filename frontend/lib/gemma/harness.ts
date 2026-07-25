import type { ZodType } from "zod";
import { GemmaUnavailableError, type GenerateFn, type GenerateOptions } from "./types";

/**
 * Defense in depth around Gemma's structured output (technical.md §4.2).
 *
 * Gemma on the Gemini API has no `responseSchema` / JSON mode, and open models
 * are historically weaker at strict tool-calling than frontier ones. So we ask
 * for plain JSON — the simplest thing for the model to produce and for us to
 * check — then strip, parse, validate, and retry with the validation error fed
 * back in. After the last attempt we return a typed failure rather than throw:
 * the demo degrades to manual entry, it never dies.
 */

export type HarnessFailureKind =
  | "no_api_key"
  /** Transient: worth another attempt. */
  | "network"
  /** The API refused the request itself — wrong file type, too many pages. */
  | "rejected"
  | "unparseable"
  | "invalid";

export interface HarnessFailure {
  kind: HarnessFailureKind;
  detail: string;
  attempts: number;
}

export type HarnessResult<T> =
  | { ok: true; value: T; attempts: number }
  | { ok: false; error: HarnessFailure };

const MAX_ATTEMPTS = 3;

/** Models like to wrap JSON in prose or ```json fences no matter what you ask. */
export function stripFences(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : raw).trim();

  // Fall back to the outermost brace pair if the model added a preamble.
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return body;
  return body.slice(start, end + 1);
}

function describeIssues(error: { issues: Array<{ path: PropertyKey[]; message: string }> }): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
}

/**
 * Generate, then parse and validate against `schema`, retrying with the
 * failure reason appended. Never throws.
 *
 * The `generate` transport is injected rather than imported, so the very same
 * prompt-building and validation runs against either the cloud API (server) or
 * a local Ollama instance (browser) — only the model call swaps.
 */
export async function generateValidated<T>(
  schema: ZodType<T>,
  options: GenerateOptions,
  generate: GenerateFn,
  maxAttempts: number = MAX_ATTEMPTS,
): Promise<HarnessResult<T>> {
  let lastDetail = "";
  let lastKind: HarnessFailureKind = "unparseable";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const prompt =
      attempt === 1
        ? options.prompt
        : `${options.prompt}\n\nYour last output failed validation: ${lastDetail}\nReturn only corrected JSON. No prose, no markdown fences.`;

    let raw: string;
    try {
      raw = await generate({ ...options, prompt });
    } catch (cause) {
      if (cause instanceof GemmaUnavailableError) {
        // A missing key, an unsupported file, a document past the page limit —
        // none of these change by asking again. Fail now and let the UI say so,
        // rather than spending three round trips to reach the same answer.
        if (cause.kind === "no_api_key" || !cause.retryable) {
          return {
            ok: false,
            error: { kind: cause.kind === "no_api_key" ? "no_api_key" : "rejected", detail: cause.message, attempts: attempt },
          };
        }
        lastKind = "network";
        lastDetail = cause.message;
        continue;
      }
      throw cause;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripFences(raw));
    } catch {
      lastKind = "unparseable";
      lastDetail = "Output was not valid JSON.";
      continue;
    }

    const result = schema.safeParse(parsed);
    if (result.success) {
      return { ok: true, value: result.data, attempts: attempt };
    }

    lastKind = "invalid";
    lastDetail = describeIssues(result.error);
  }

  return { ok: false, error: { kind: lastKind, detail: lastDetail, attempts: maxAttempts } };
}
