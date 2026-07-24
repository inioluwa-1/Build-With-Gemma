import { z } from "zod";
import type { Lang } from "@/lib/i18n/types";
import type { OutputLang } from "@/lib/i18n/output-langs";

/**
 * Explanation output (technical.md §6).
 *
 * All three languages come back in one pass, which is what makes the toggle —
 * and the live Pidgin reveal — a client-side swap with no second request.
 */

const NonEmpty = z.string().min(1);

/** Verified documents: one natural paragraph explaining a verdict the model did not compute. */
export const VerdictExplanationSchema = z.object({
  en: NonEmpty,
  yo: NonEmpty,
  pcm: NonEmpty,
});

/**
 * One entry in the clause-by-clause breakdown (the numbered cards in the
 * Document Analysis Report). The document sets how many there are.
 */
const ClauseSchema = z.object({
  /** Short label, e.g. "Use of property", "Rent", "Term". */
  heading: NonEmpty,
  /** Plain-language account of that clause. May use **bold** sub-labels and newlines. */
  detail: NonEmpty,
});

/**
 * Interpretation-only documents, rendered as a Document Analysis Report.
 *
 * The account is broken into named clauses rather than one prose blob, so a
 * long document reads as a scannable breakdown. Amounts and dates still render
 * separately from the confirmed facts, under "(listed, not checked)", so the
 * model never restates a number differently from the document.
 */
const SectionsSchema = z.object({
  /** The document's own name, for the report header, e.g. "Residential Tenancy Agreement". */
  title: NonEmpty,
  /** One or two sentences for the sidebar: what this document is and who it binds. */
  whatThisIs: NonEmpty,
  /** One-paragraph overview under the "What it says" heading. */
  overview: NonEmpty,
  /** The clause-by-clause breakdown. */
  clauses: z.array(ClauseSchema).min(1),
  /** Exactly what the reader is asked or required to do. */
  whatItAsks: NonEmpty,
  /** What a reader could easily miss — named, never advised on. */
  watchOut: NonEmpty,
});

export type InterpretationClause = z.infer<typeof ClauseSchema>;

export const InterpretationExplanationSchema = z.object({
  en: SectionsSchema,
  yo: SectionsSchema,
  pcm: SectionsSchema,
});

/**
 * A faithful account of a long document, times three languages, is a lot of
 * tokens — measured at 53.8s for a tenancy notice. So interpretation is fetched
 * in two passes: the language on screen first, the other two straight after in
 * the background. Time to first result drops to roughly a third, and the toggle
 * is still an instant client-side swap by the time anyone reaches for it.
 */
export function interpretationSchemaFor(langs: OutputLang[]) {
  return z.object(
    Object.fromEntries(langs.map((lang) => [lang, SectionsSchema])),
  ) as unknown as z.ZodType<Partial<Record<OutputLang, InterpretationSections>>>;
}

export type InterpretationSections = z.infer<typeof SectionsSchema>;

/**
 * The verdict explanation stays the three UI languages — it is a short
 * paragraph fetched with the verdict. Interpretation output, by contrast, is
 * chosen per document from the wider `OutputLang` set and filled in on demand,
 * so its sections are partial: only the languages fetched so far are present.
 */
export type Explanation =
  | { kind: "verdict"; text: Record<Lang, string> }
  | { kind: "interpretation"; sections: Partial<Record<OutputLang, InterpretationSections>> };
