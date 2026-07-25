import { asBill, verifyElectricityBill } from "../verify/electricity";
import type { DocumentType, NercTable, Ruleset } from "../verify/types";
import nercTable from "./nerc-table.json";
import registry from "./registry.json";

/**
 * Rulesets are imported, not fetched: bundling them makes offline verification
 * a build-time guarantee rather than a cache-hit gamble. Adding a verification
 * vertical is still one new table + one new entry here — no code path changes,
 * no retraining (technical.md §3).
 */
const TABLES: Record<string, unknown> = {
  "nerc-table.json": nercTable,
};

const VERIFIERS: Record<string, (table: unknown) => Ruleset["verify"]> = {
  "nerc-electricity": (table) => (doc) => {
    const bill = asBill(doc);
    if (!bill) return { status: "interpretation_only", documentType: doc.documentType };
    return verifyElectricityBill(bill, table as NercTable);
  },
};

function build(): Ruleset[] {
  return registry.rulesets.flatMap((entry) => {
    const table = TABLES[entry.table] as { source: string; effectiveDate: string } | undefined;
    const makeVerify = VERIFIERS[entry.id];
    if (!table || !makeVerify) return [];
    return [
      {
        id: entry.id,
        documentType: entry.documentType as DocumentType,
        schema: entry.schema,
        source: table.source,
        effectiveDate: table.effectiveDate,
        verify: makeVerify(table),
      },
    ];
  });
}

const RULESETS = build();

/**
 * The enforcement point for "the model proposes, the code disposes"
 * (technical.md §4.1). Gemma's own `rulesetId` output is never trusted — the
 * document type it reports is looked up here, so the model cannot invent a
 * verification pathway that does not exist.
 */
export function resolveRuleset(documentType: DocumentType): Ruleset | null {
  return RULESETS.find((r) => r.documentType === documentType) ?? null;
}

export function hasRuleset(documentType: DocumentType): boolean {
  return resolveRuleset(documentType) !== null;
}

export function getNercTable(): NercTable {
  return nercTable as NercTable;
}

export { RULESETS };
