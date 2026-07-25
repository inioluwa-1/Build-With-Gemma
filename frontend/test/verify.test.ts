import { describe, expect, it } from "vitest";
import { getNercTable, resolveRuleset } from "../lib/rulesets";
import { verifyDocument, verifyElectricityBill } from "../lib/verify";
import type { Band, ConfirmedBill, ConfirmedGenericDocument, NercTable } from "../lib/verify/types";

const table = getNercTable();

function bill(overrides: Partial<ConfirmedBill> = {}): ConfirmedBill {
  return {
    documentType: "electricity_bill",
    band: "A",
    unitsKwh: 142,
    amountCharged: 31980.18,
    energyCharge: 29749,
    arrears: null,
    readingType: "actual",
    ...overrides,
  };
}

/** 142 kWh × ₦209.50 = ₦29,749.00, + 7.5% VAT = ₦31,980.18. */
const BAND_A_EXPECTED = 31980.18;

describe("verifyElectricityBill — the correct bill must verify as correct", () => {
  it("passes a bill charged exactly the published rate", () => {
    const verdict = verifyElectricityBill(bill(), table);
    expect(verdict.status).toBe("checks_out");
    if (verdict.status !== "checks_out") return;
    expect(verdict.expected).toBe(BAND_A_EXPECTED);
    expect(verdict.effectiveDate).toBe(table.effectiveDate);
    expect(verdict.source).toContain("NERC");
  });

  it("shows its work even when the bill checks out", () => {
    const verdict = verifyElectricityBill(bill(), table);
    if (verdict.status !== "checks_out") throw new Error("expected checks_out");
    expect(verdict.math.map((line) => line.key)).toEqual([
      "math.energy",
      "math.vat",
      "math.expectedTotal",
      "math.charged",
    ]);
    expect(verdict.math.find((l) => l.key === "math.vat")?.value).toBe(2231.18);
  });

  it("models VAT — units × rate alone would flag this correct bill", () => {
    const withoutVat = verifyElectricityBill(bill({ amountCharged: 29749 }), table);
    expect(withoutVat.status).toBe("discrepancy");
  });
});

describe("verifyElectricityBill — discrepancies", () => {
  // The worked example from design.md §3.3.
  it("flags an overcharge with the correct difference", () => {
    const verdict = verifyElectricityBill(bill({ amountCharged: 38400 }), table);
    expect(verdict.status).toBe("discrepancy");
    if (verdict.status !== "discrepancy") return;
    expect(verdict.difference).toBeCloseTo(6419.82, 2);
    expect(verdict.expected).toBe(BAND_A_EXPECTED);
    expect(verdict.charged).toBe(38400);
    expect(verdict.math.at(-1)?.key).toBe("math.difference");
  });

  it("reports an undercharge as a negative difference, not an overcharge", () => {
    const verdict = verifyElectricityBill(bill({ amountCharged: 25000 }), table);
    expect(verdict.status).toBe("discrepancy");
    if (verdict.status !== "discrepancy") return;
    expect(verdict.difference).toBeLessThan(0);
  });
});

describe("verifyElectricityBill — arrears are never an error", () => {
  it("checks out when the excess is exactly the arrears line", () => {
    const verdict = verifyElectricityBill(
      bill({ amountCharged: BAND_A_EXPECTED + 5000, arrears: 5000 }),
      table,
    );
    expect(verdict.status).toBe("checks_out");
  });

  it("renders arrears as a detached line plus the like-for-like subtotal", () => {
    const verdict = verifyElectricityBill(
      bill({ amountCharged: BAND_A_EXPECTED + 5000, arrears: 5000 }),
      table,
    );
    if (verdict.status !== "checks_out") throw new Error("expected checks_out");
    const arrearsLine = verdict.math.find((l) => l.key === "math.arrears");
    expect(arrearsLine).toMatchObject({ kind: "aside", value: 5000 });
    expect(verdict.math.find((l) => l.key === "math.comparable")?.value).toBe(BAND_A_EXPECTED);
    expect(verdict.charged).toBe(BAND_A_EXPECTED);
  });

  it("still catches an overcharge that is hiding behind arrears", () => {
    const verdict = verifyElectricityBill(
      bill({ amountCharged: 38400 + 5000, arrears: 5000 }),
      table,
    );
    expect(verdict.status).toBe("discrepancy");
    if (verdict.status !== "discrepancy") return;
    expect(verdict.difference).toBeCloseTo(6419.82, 2);
  });
});

describe("verifyElectricityBill — ask, don't guess", () => {
  it.each([
    ["unitsKwh", { unitsKwh: null }],
    ["amountCharged", { amountCharged: null }],
    ["band", { band: null }],
  ] as const)("cannot verify without %s", (field, override) => {
    const verdict = verifyElectricityBill(bill(override), table);
    expect(verdict.status).toBe("cannot_verify");
    if (verdict.status !== "cannot_verify") return;
    expect(verdict.reason).toBe("missing_fields");
    expect(verdict.missing).toContain(field);
  });

  it("lists every missing field at once", () => {
    const verdict = verifyElectricityBill(
      bill({ band: null, unitsKwh: null, amountCharged: null }),
      table,
    );
    if (verdict.status !== "cannot_verify") throw new Error("expected cannot_verify");
    expect(verdict.missing).toEqual(["band", "unitsKwh", "amountCharged"]);
  });

  it("refuses to verify against an unfilled reference rate", () => {
    const unfilled: NercTable = {
      ...table,
      bands: { ...table.bands, C: { minSupplyHours: 12, ratePerKwh: 0 } },
    };
    const verdict = verifyElectricityBill(bill({ band: "C" }), unfilled);
    expect(verdict.status).toBe("cannot_verify");
    if (verdict.status !== "cannot_verify") return;
    expect(verdict.reason).toBe("no_published_rate");
  });
});

describe("verifyElectricityBill — every band", () => {
  const bands: Band[] = ["A", "B", "C", "D", "E"];

  it.each(bands)("band %s has a published rate", (band) => {
    expect(table.bands[band].ratePerKwh).toBeGreaterThan(0);
  });

  it.each(bands)("band %s verifies a bill priced at its own rate", (band) => {
    const units = 100;
    const expected = Math.round(units * table.bands[band].ratePerKwh * 1.075 * 100) / 100;
    const verdict = verifyElectricityBill(
      bill({ band, unitsKwh: units, amountCharged: expected }),
      table,
    );
    expect(verdict.status).toBe("checks_out");
  });

  it("flags a Band C bill charged at the Band A rate", () => {
    const verdict = verifyElectricityBill(
      bill({ band: "C", unitsKwh: 100, amountCharged: 100 * 209.5 * 1.075 }),
      table,
    );
    expect(verdict.status).toBe("discrepancy");
  });
});

describe("verifyElectricityBill — tolerance edges", () => {
  // Band E, 100 kWh: expected ₦4,300.00, tolerance = max(₦50, 1%) = ₦50.
  const base = { band: "E" as Band, unitsKwh: 100 };

  it("absorbs a difference exactly at the floor", () => {
    const verdict = verifyElectricityBill(bill({ ...base, amountCharged: 4350 }), table);
    expect(verdict.status).toBe("checks_out");
  });

  it("flags a difference one naira past the floor", () => {
    const verdict = verifyElectricityBill(bill({ ...base, amountCharged: 4351 }), table);
    expect(verdict.status).toBe("discrepancy");
  });

  it("scales to 1% on large bills", () => {
    // Band A, 142 kWh: 1% of ₦31,980.18 = ₦319.80, which beats the ₦50 floor.
    const inside = verifyElectricityBill(bill({ amountCharged: BAND_A_EXPECTED + 300 }), table);
    const outside = verifyElectricityBill(bill({ amountCharged: BAND_A_EXPECTED + 400 }), table);
    expect(inside.status).toBe("checks_out");
    expect(outside.status).toBe("discrepancy");
  });
});

describe("verifyDocument — the tier boundary", () => {
  const notice: ConfirmedGenericDocument = {
    documentType: "tenancy_document",
    issuer: "Adeyemi & Co. Solicitors",
    subject: "Quit notice",
    amounts: [{ label: "Outstanding rent", value: 450000, currency: "NGN" }],
    dates: [{ label: "Vacate by", value: "2026-09-30" }],
    obligations: ["Vacate the premises", "Settle outstanding rent"],
  };

  it("returns interpretation_only for a document with no ruleset", () => {
    const verdict = verifyDocument(notice, resolveRuleset(notice.documentType));
    expect(verdict).toEqual({
      status: "interpretation_only",
      documentType: "tenancy_document",
    });
  });

  it.each([
    "tenancy_document",
    "government_notice",
    "loan_or_financial",
    "wage_statement",
    "legal_document",
    "other",
  ] as const)("never stamps a %s", (documentType) => {
    const verdict = verifyDocument(
      { ...notice, documentType },
      resolveRuleset(documentType),
    );
    expect(verdict.status).toBe("interpretation_only");
    expect(verdict.status).not.toBe("checks_out");
    expect(verdict.status).not.toBe("discrepancy");
  });

  it("routes an electricity bill to the NERC ruleset", () => {
    const ruleset = resolveRuleset("electricity_bill");
    expect(ruleset?.id).toBe("nerc-electricity");
    expect(verifyDocument(bill(), ruleset).status).toBe("checks_out");
  });

  it("cannot verify a non-bill even when handed the bill ruleset", () => {
    const verdict = verifyDocument(notice, resolveRuleset("electricity_bill"));
    expect(verdict.status).toBe("interpretation_only");
  });
});

describe("nerc-table — the rule source is stamped and current", () => {
  it("carries an effective date and a named source", () => {
    expect(table.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(table.source).toMatch(/NERC/);
    expect(table.disco).toBeTruthy();
  });

  it("carries supply hours for the complaint-ground note only", () => {
    expect(table.bands.A.minSupplyHours).toBe(20);
  });
});
