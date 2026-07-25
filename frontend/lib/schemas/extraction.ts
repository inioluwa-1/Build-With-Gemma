import { z } from "zod";

/**
 * Zod mirrors of the extraction contract (technical.md §4.1).
 *
 * Note what is *absent*: `rulesetId`. technical.md has the model propose one
 * and the code dispose of it — we go a step further and never ask, so the model
 * has no channel through which to invent a verification pathway. The document
 * type it reports is looked up against the registry, and that lookup is the
 * only way a ruleset is ever chosen.
 */

export const GENERIC_DOCUMENT_TYPES = [
  "tenancy_document",
  "government_notice",
  "loan_or_financial",
  "wage_statement",
  "legal_document",
  "other",
] as const;

export const DocumentTypeSchema = z.enum(["electricity_bill", ...GENERIC_DOCUMENT_TYPES]);
export const GenericDocumentTypeSchema = z.enum(GENERIC_DOCUMENT_TYPES);

const Confidence = z.number().min(0).max(1);

/**
 * Confidence is a loose record on purpose. A key the model omits reads as 0,
 * which routes the field to "I couldn't read this — type it here". The lenient
 * direction is the safe one: unknown confidence must mean ask, never assume.
 */
const ConfidenceMap = z.record(z.string(), Confidence).default({});

const NonNegative = z.number().nonnegative().nullable();

export const ElectricityBillFieldsSchema = z.object({
  band: z.enum(["A", "B", "C", "D", "E"]).nullable(),
  unitsKwh: NonNegative,
  amountCharged: NonNegative,
  energyCharge: NonNegative,
  arrears: NonNegative,
  readingType: z.enum(["estimated", "actual"]).nullable(),
  confidence: ConfidenceMap,
});

export const GenericDocumentFactsSchema = z.object({
  issuer: z.string().nullable(),
  subject: z.string().nullable(),
  amounts: z
    .array(
      z.object({
        label: z.string(),
        value: z.number(),
        currency: z.string().default("NGN"),
      }),
    )
    .default([]),
  dates: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
  obligations: z.array(z.string()).default([]),
  confidence: ConfidenceMap,
});

/**
 * The two branches cannot cross-match: a generic document type is excluded from
 * the bill branch by the literal, and `electricity_bill` is excluded from the
 * generic branch by the enum.
 */
export const ClassifiedExtractionSchema = z.union([
  z.object({
    documentType: z.literal("electricity_bill"),
    fields: ElectricityBillFieldsSchema,
  }),
  z.object({
    documentType: GenericDocumentTypeSchema,
    fields: GenericDocumentFactsSchema,
  }),
]);

export type ClassifiedExtraction = z.infer<typeof ClassifiedExtractionSchema>;
export type ElectricityBillFields = z.infer<typeof ElectricityBillFieldsSchema>;
export type GenericDocumentFacts = z.infer<typeof GenericDocumentFactsSchema>;

// Confidence gating lives in lib/confidence.ts: the Confirm screen needs it,
// and importing it from here would pull Zod into the client bundle.
export { CONFIDENCE_THRESHOLD, isConfident } from "@/lib/confidence";
