import { applyRate, toKobo, toNaira, toleranceKobo } from "./money";
import type {
  ConfirmedBill,
  ConfirmedDocument,
  MathLine,
  NercTable,
  Verdict,
} from "./types";

/**
 * The flagship ruleset verifier (technical.md §5).
 *
 * Deliberate boundaries, each one load-bearing:
 *  - VAT is modelled. `units × rate` alone flags every correct bill.
 *  - Arrears are removed before comparison and rendered as their own line.
 *    A bill is never wrong because the customer owes money from last month.
 *  - A tolerance band absorbs kobo rounding and small fixed sundries.
 *  - Only rate-vs-band is checked. Band *eligibility* depends on hours of
 *    supply, which cannot be read off the document, so it is surfaced as a
 *    complaint ground and never enters the verdict (PRD §6).
 *
 * All arithmetic runs in integer kobo; naira appear only on the way out.
 */
export function verifyElectricityBill(bill: ConfirmedBill, table: NercTable): Verdict {
  // 1. Required fields. Ask, never guess.
  const missing: string[] = [];
  if (!bill.band) missing.push("band");
  if (bill.unitsKwh === null || Number.isNaN(bill.unitsKwh)) missing.push("unitsKwh");
  if (bill.amountCharged === null || Number.isNaN(bill.amountCharged)) {
    missing.push("amountCharged");
  }
  if (missing.length > 0) {
    return { status: "cannot_verify", reason: "missing_fields", missing };
  }

  const band = bill.band!;
  const unitsKwh = bill.unitsKwh!;
  const amountCharged = bill.amountCharged!;
  const rule = table.bands[band];

  // Guard: an unfilled reference rate must never produce a verdict. A rate of
  // zero would make every bill look overcharged, and a false accusation is
  // worse than no answer at all.
  if (!rule || !(rule.ratePerKwh > 0)) {
    return { status: "cannot_verify", reason: "no_published_rate", missing: ["band"] };
  }

  // 2–4. Expected total from the published rate.
  const energyKobo = toKobo(unitsKwh * rule.ratePerKwh);
  const vatKobo = table.ratesIncludeVat ? 0 : applyRate(energyKobo, table.vatRate);
  const expectedKobo = energyKobo + vatKobo;

  // 5. Arrears are a separate obligation, not a billing error.
  const arrearsKobo = toKobo(bill.arrears ?? 0);
  const comparableKobo = toKobo(amountCharged) - arrearsKobo;

  // 6–7. Compare like for like, within tolerance.
  const differenceKobo = comparableKobo - expectedKobo;
  const withinTolerance =
    Math.abs(differenceKobo) <= toleranceKobo(expectedKobo, table.tolerance);

  const math: MathLine[] = [
    {
      key: "math.energy",
      params: { units: unitsKwh, rate: rule.ratePerKwh, band },
      value: toNaira(energyKobo),
      kind: "input",
    },
  ];

  if (!table.ratesIncludeVat) {
    math.push({
      key: "math.vat",
      params: { percent: table.vatRate * 100 },
      value: toNaira(vatKobo),
      kind: "computed",
    });
  }

  math.push({ key: "math.expectedTotal", value: toNaira(expectedKobo), kind: "total" });
  math.push({ key: "math.charged", value: amountCharged, kind: "input" });

  if (arrearsKobo > 0) {
    // Shown, subtracted in the open, and explicitly not counted against the bill.
    math.push({ key: "math.arrears", value: toNaira(arrearsKobo), kind: "aside" });
    math.push({ key: "math.comparable", value: toNaira(comparableKobo), kind: "computed" });
  }

  const shared = {
    math,
    expected: toNaira(expectedKobo),
    // The like-for-like figure: what was charged for energy, arrears removed.
    charged: toNaira(comparableKobo),
    band,
    source: table.source,
    effectiveDate: table.effectiveDate,
  };

  if (withinTolerance) {
    return { status: "checks_out", ...shared };
  }

  // Signed: positive means overcharged, negative means charged less than the
  // published rate. The UI picks its wording from the sign — stamping
  // "OVERCHARGED" on an undercharge would be the same false accusation in
  // reverse.
  const difference = toNaira(differenceKobo);
  math.push({ key: "math.difference", value: difference, kind: "difference" });

  return { status: "discrepancy", ...shared, difference };
}

/** Narrowing helper so the registry can bind a bill verifier to a Ruleset. */
export function asBill(doc: ConfirmedDocument): ConfirmedBill | null {
  return doc.documentType === "electricity_bill" ? doc : null;
}
