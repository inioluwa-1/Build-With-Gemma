import { generateValidated, type HarnessResult } from "./harness";
import type { InlineImage } from "./client";
import {
  ClassifiedExtractionSchema,
  type ClassifiedExtraction,
} from "@/lib/schemas/extraction";

/**
 * Classification + extraction in one multimodal call (technical.md §4).
 *
 * The model's whole job is reading. It does not decide whether a document can
 * be verified, it does not compute totals, and it is told in as many words that
 * `null` is the correct answer for anything it cannot read.
 */
const SYSTEM = `You read photographs of official documents and return structured JSON. You do not interpret, advise, or calculate.

First classify the document. "documentType" must be exactly one of:
electricity_bill, tenancy_document, government_notice, loan_or_financial, wage_statement, legal_document, other

Then extract the fields for that type.

If documentType is "electricity_bill", return:
{
  "documentType": "electricity_bill",
  "fields": {
    "band": "A" | "B" | "C" | "D" | "E" | null,
    "unitsKwh": number | null,
    "amountCharged": number | null,
    "energyCharge": number | null,
    "arrears": number | null,
    "readingType": "estimated" | "actual" | null,
    "confidence": { "band": 0-1, "unitsKwh": 0-1, "amountCharged": 0-1, "energyCharge": 0-1, "arrears": 0-1, "readingType": 0-1 }
  }
}

For every other documentType, return:
{
  "documentType": "<the type you chose>",
  "fields": {
    "issuer": string | null,
    "subject": string | null,
    "amounts": [{ "label": string, "value": number, "currency": "NGN" }],
    "dates": [{ "label": string, "value": "YYYY-MM-DD or as printed" }],
    "obligations": [string],
    "confidence": { "issuer": 0-1, "subject": 0-1, "amounts": 0-1, "dates": 0-1, "obligations": 0-1 }
  }
}

Rules:
- If you cannot read a field, return null with low confidence. Never guess a number.
- Numbers must be plain digits: 31980.18, not "₦31,980.18".
- Copy amounts exactly as printed. Never add up, convert, or correct them.
- "amountCharged" is the total payable. "arrears" is any brought-forward balance shown as its own line.
- Obligations describe what the document asks the reader to do, in the document's own terms.
- Return only the JSON object. No prose, no explanation, no markdown fences.`;

export function extractFromImage(
  image: InlineImage,
  signal?: AbortSignal,
): Promise<HarnessResult<ClassifiedExtraction>> {
  return generateValidated(ClassifiedExtractionSchema, {
    system: SYSTEM,
    prompt: "Read this document and return the JSON described above.",
    image,
    temperature: 0,
    signal,
  });
}
