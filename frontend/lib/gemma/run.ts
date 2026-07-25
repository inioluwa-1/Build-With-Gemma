import { createOllamaGenerate } from "./ollama";
import { extractFromImage } from "./extract";
import { explainVerdict, explainDocument } from "./explain";
import { polishComplaint } from "./complaint";
import type { InlineImage } from "./types";
import type { ProviderConfig } from "@/lib/provider";
import type { Lang } from "@/lib/i18n/types";
import type { OutputLang } from "@/lib/i18n/output-langs";
import type { ClassifiedExtraction } from "@/lib/schemas/extraction";
import type { InterpretationSections } from "@/lib/schemas/explain";
import type { ConfirmedGenericDocument, Verdict } from "@/lib/verify/types";

/**
 * The transport router the client calls for every model task.
 *
 * In "cloud" mode it POSTs to the existing API routes (the key stays on the
 * server); in "local" mode it runs the very same prompt builders and validation
 * harness in the browser against the user's Ollama. Either way it returns the
 * exact JSON shape the routes return, so the page reads the result the same way
 * regardless of where the model ran.
 */

/**
 * The union of what the three routes return, so the page reads a result the
 * same way no matter which task or transport produced it. Fields are optional
 * because each task fills only its own; `ok` discriminates success from a typed
 * failure, exactly as the routes do.
 */
export interface TaskResult {
  ok: boolean;
  error?: { kind: string; attempts?: number };
  extraction?: ClassifiedExtraction;
  kind?: "verdict" | "interpretation";
  explanation?: Record<Lang, string> | Partial<Record<OutputLang, InterpretationSections>>;
  text?: string;
}

const jsonPost = (url: string, body: unknown, signal?: AbortSignal) =>
  fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  }).then((response) => response.json() as Promise<TaskResult>);

export async function runExtract(
  image: InlineImage,
  provider: ProviderConfig,
  signal?: AbortSignal,
): Promise<TaskResult> {
  if (provider.mode === "cloud") return jsonPost("/api/extract", { image }, signal);

  const result = await extractFromImage(image, createOllamaGenerate(provider), signal);
  return result.ok
    ? { ok: true, extraction: result.value }
    : { ok: false, error: { kind: result.error.kind, attempts: result.error.attempts } };
}

export type ExplainBody =
  | { kind: "verdict"; verdict: Verdict }
  | {
      kind: "interpretation";
      doc: ConfirmedGenericDocument;
      source?: InlineImage;
      langs: OutputLang[];
    };

export async function runExplain(
  body: ExplainBody,
  provider: ProviderConfig,
  signal?: AbortSignal,
): Promise<TaskResult> {
  if (provider.mode === "cloud") return jsonPost("/api/explain", body, signal);

  const generate = createOllamaGenerate(provider);
  if (body.kind === "verdict") {
    const result = await explainVerdict(body.verdict, generate, signal);
    return result.ok
      ? { ok: true, kind: "verdict", explanation: result.value }
      : { ok: false, error: { kind: result.error.kind } };
  }
  const result = await explainDocument(body.doc, generate, body.source, body.langs, signal);
  return result.ok
    ? { ok: true, kind: "interpretation", explanation: result.value }
    : { ok: false, error: { kind: result.error.kind } };
}

export async function runComplaint(
  template: string,
  lang: Lang,
  provider: ProviderConfig,
  signal?: AbortSignal,
): Promise<TaskResult> {
  if (provider.mode === "cloud") return jsonPost("/api/complaint", { template, lang }, signal);

  const result = await polishComplaint(template, lang, createOllamaGenerate(provider), signal);
  return result.ok
    ? { ok: true, text: result.value.text }
    : { ok: false, error: { kind: result.error.kind } };
}
