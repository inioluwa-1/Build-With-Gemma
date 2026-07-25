import type { ConfirmedDocument, Ruleset, Verdict } from "./types";

/**
 * The single entry point to verification.
 *
 * No ruleset means no verdict — ever. `interpretation_only` short-circuits
 * before any math runs, so a document without published rules is structurally
 * incapable of receiving a stamp (technical.md §5).
 */
export function verifyDocument(doc: ConfirmedDocument, ruleset: Ruleset | null): Verdict {
  if (!ruleset) {
    return { status: "interpretation_only", documentType: doc.documentType };
  }
  return ruleset.verify(doc);
}

export * from "./types";
export { verifyElectricityBill } from "./electricity";
export { applyRate, round2, toKobo, toNaira, toleranceKobo } from "./money";
