import { generateValidated, type HarnessResult } from "./harness";
import type { GenerateFn } from "./types";
import { formatDate, formatNaira, formatNumber } from "@/lib/format";
import {
  interpretationSchemaFor,
  VerdictExplanationSchema,
  type InterpretationSections,
} from "@/lib/schemas/explain";
import { OUTPUT_LANG_NAMES, type OutputLang } from "@/lib/i18n/output-langs";
import type { ConfirmedGenericDocument, Verdict } from "@/lib/verify/types";
import type { z } from "zod";

/**
 * Explanation and interpretation (technical.md §6).
 *
 * Both calls receive structured, already-decided input — never the raw image.
 * The model explains a verdict it did not compute, or describes facts it is
 * forbidden to evaluate. All three languages come back in one pass.
 */

const STYLE = `Write for someone who is fluent in conversation but not in officialese, reading on a phone.

- Write each language the way a person actually speaks it — natural, warm and direct, not stiff broadcast translation. In English: plain, second person, sentence case, short sentences.
- In any other language, use the everyday register a friend would use, with correct diacritics and tone marks where the language uses them (e.g. Yorùbá ẹ, ọ, ṣ). Nigerian Pidgin should read as spoken Pidgin, not anglicised.

Never apologise. Never use jargon without unpacking it in the same sentence: "arrears" is money carried over from a previous bill; an "estimated" reading is a guess by the DisCo rather than a meter reading.

NUMBERS AND DATES — the same rule in every language, including Yorùbá and Pidgin:
- Copy every amount, date, percentage, account number and reference exactly as it appears, in digits: "31 July 2026", "₦450,000", "10%".
- Never spell a number or a date out in words. Writing a date in Yorùbá words has already produced the wrong day; digits cannot be got wrong in translation.
- Never recalculate, round, reformat or restate a number differently from the source.
Only the words around the numbers are translated. The numbers themselves are copied.

Two to four sentences per language.`;

const VERDICT_SYSTEM = `You explain the result of a check that has already been done. You did not perform the check and you must not redo it.

${STYLE}

Return only this JSON object, no prose and no markdown fences:
{ "en": "...", "yo": "...", "pcm": "..." }`;

const interpretationSystem = (langs: OutputLang[]) => `You explain what an official document says, in plain language, to someone who has to act on it.

You have not verified this document. Never claim any number or term is correct or incorrect.

Describe, never advise. State what the document says and what it asks of the reader. Do not tell the reader what to do, what to sign, whether a term is fair, or what their rights are. No legal opinions. If something in the document deserves attention, name it plainly as something to be aware of — not as a recommendation.

You produce a Document Analysis Report. Field by field:

- "title": the document's own name, as a report heading — e.g. "Residential Tenancy Agreement", "Notice to Quit", "Salary Statement". Title case, no trailing punctuation.
- "whatThisIs": one or two sentences for the sidebar. What kind of document this is and who it binds — name the parties.
- "overview": one short paragraph. What the document is and its purpose, at a glance.
- "clauses": THE MAIN CONTENT, and the reason the reader opened the app. Break the document into its distinct terms and render each as one clause object: { "heading": short label, "detail": plain-language account }. Cover every substantive point — the parties, each term or clause, every amount and what it is for, every date and what happens on it, every condition or consequence. One clause per distinct topic, in the order the document presents them. Do not compress the document into three clauses, and do not skip one because it seems minor; a tenancy agreement may run to eight or more. "heading" is a few words ("Use of property", "Rent", "Term"). "detail" translates the jargon as it goes; use **bold** for sub-labels ("**Guests:** …") and newlines to separate them. Where the document leaves a field blank or a figure missing, begin that detail with "MISSING DATA:" and say what is absent.
- "whatItAsks": exactly what the reader is required or requested to do, with the deadline attached to each.
- "watchOut": anything a reader could easily miss or misread — an automatic renewal, a penalty, a short deadline, a recurring cost. Name it and say what the document says about it. Never advise.

${STYLE}

The two-to-four-sentence guidance applies to the short fields. "clauses" is as long and as many as the document requires.

Return only this JSON object, no prose and no markdown fences. It must have exactly ${langs.length} top-level key${langs.length === 1 ? "" : "s"} — ${langs.map((l) => `"${l}"`).join(", ")} — and no others:
{
${langs
  .map(
    (l) =>
      `  "${l}": { "title": "...", "whatThisIs": "...", "overview": "...", "clauses": [ { "heading": "...", "detail": "..." } ], "whatItAsks": "...", "watchOut": "..." }`,
  )
  .join(",\n")}
}`;

/**
 * Render the verdict as exact English facts. The model paraphrases these into
 * three languages; it never sees the arithmetic, only the settled result.
 */
function describeVerdict(verdict: Verdict): string {
  if (verdict.status === "cannot_verify") {
    return `The bill could not be checked because these fields are missing: ${verdict.missing.join(", ")}.`;
  }
  if (verdict.status === "interpretation_only") {
    return "This document has no published ruleset and was not checked.";
  }

  const lines: string[] = [`The bill is on Band ${verdict.band}.`];

  for (const line of verdict.math) {
    if (line.value === null) continue;
    const amount = formatNaira(line.value);
    switch (line.key) {
      case "math.energy":
        lines.push(
          `Energy for ${formatNumber(Number(line.params?.units ?? 0))} kWh at the published Band ${verdict.band} rate of ₦${formatNumber(Number(line.params?.rate ?? 0))} per kWh is ${amount}.`,
        );
        break;
      case "math.vat":
        lines.push(`VAT at ${formatNumber(Number(line.params?.percent ?? 0))}% is ${amount}.`);
        break;
      case "math.expectedTotal":
        lines.push(`The bill should therefore be ${amount}.`);
        break;
      case "math.charged":
        lines.push(`The customer was charged ${amount} in total.`);
        break;
      case "math.arrears":
        lines.push(
          `${amount} of that is arrears carried over from a previous bill. Arrears are a separate debt and are not a billing error.`,
        );
        break;
      case "math.comparable":
        lines.push(`Setting arrears aside, this month's charge is ${amount}.`);
        break;
      default:
        break;
    }
  }

  if (verdict.status === "checks_out") {
    lines.push("The bill matches the published rate. It checks out.");
  } else {
    lines.push(
      verdict.difference > 0
        ? `The customer was overcharged by ${formatNaira(verdict.difference)}.`
        : `The customer was charged ${formatNaira(Math.abs(verdict.difference))} less than the published rate gives.`,
    );
  }

  lines.push(`Checked against the ${verdict.source}, effective ${formatDate(verdict.effectiveDate)}.`);
  return lines.join("\n");
}

export function explainVerdict(
  verdict: Verdict,
  generate: GenerateFn,
  signal?: AbortSignal,
): Promise<HarnessResult<z.infer<typeof VerdictExplanationSchema>>> {
  return generateValidated(
    VerdictExplanationSchema,
    {
      system: VERDICT_SYSTEM,
      prompt: `Explain this result to the customer in all three languages.\n\n${describeVerdict(verdict)}`,
      temperature: 0.4,
      signal,
    },
    generate,
  );
}

/**
 * Interpretation is written from the document itself, not from extracted fields.
 *
 * Extraction exists to feed *verification* — typed numbers a deterministic
 * function can check, which the user confirms first. Interpretation has no
 * verdict to protect, so routing it through five extracted fields only
 * discarded the document and guaranteed a thin answer. The model reads the
 * page here; it still decides nothing.
 *
 * Manual entry has no file, so the confirmed facts remain the fallback.
 */
export function explainDocument(
  doc: ConfirmedGenericDocument,
  generate: GenerateFn,
  source?: { mimeType: string; data: string },
  langs: OutputLang[] = ["en"],
  signal?: AbortSignal,
): Promise<HarnessResult<Partial<Record<OutputLang, InterpretationSections>>>> {
  const facts = [
    `Document type: ${doc.documentType.replace(/_/g, " ")}`,
    `Sent by: ${doc.issuer ?? "not stated"}`,
    `Subject: ${doc.subject ?? "not stated"}`,
    doc.amounts.length
      ? `Amounts listed: ${doc.amounts.map((a) => `${a.label} ${formatNaira(a.value)}`).join("; ")}`
      : "Amounts listed: none",
    doc.dates.length
      ? `Dates listed: ${doc.dates.map((d) => `${d.label} ${d.value}`).join("; ")}`
      : "Dates listed: none",
    doc.obligations.length
      ? `It asks the reader to: ${doc.obligations.join("; ")}`
      : "It states no explicit obligation.",
  ].join("\n");

  const wanted = langs.map((lang) => `"${lang}" (${OUTPUT_LANG_NAMES[lang]})`).join(", ");

  return generateValidated(
    interpretationSchemaFor(langs),
    {
      system: interpretationSystem(langs),
      prompt: source
        ? `Explain the attached document. Read it in full and work from what is actually written on it.\n\nReturn exactly these ${langs.length} top-level keys and no others: ${wanted}.\n\nFor reference, these fields were read off it earlier — use the document itself where they disagree:\n${facts}`
        : `Explain this document. These are the only facts available; there is no file to read.\n\nReturn exactly these ${langs.length} top-level keys and no others: ${wanted}.\n\n${facts}`,
      ...(source ? { image: source } : {}),
      temperature: 0.4,
      // A long document produces a long "whatItSays", three times over.
      maxOutputTokens: 8000,
      signal,
    },
    generate,
  );
}
