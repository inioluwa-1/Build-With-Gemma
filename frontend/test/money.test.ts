import { describe, expect, it } from "vitest";
import { applyRate, toKobo, toNaira, toleranceKobo } from "../lib/verify/money";

describe("money — integer kobo arithmetic", () => {
  it("rounds VAT half-up where floating point rounds down", () => {
    // 29749 × 0.075 is exactly 2231.175. In binary floating point it is
    // 2231.1749999999997, which would round to ₦2,231.17.
    expect(toNaira(applyRate(toKobo(29749), 0.075))).toBe(2231.18);
  });

  it("keeps a whole bill exact end to end", () => {
    const energy = toKobo(142 * 209.5);
    expect(toNaira(energy + applyRate(energy, 0.075))).toBe(31980.18);
  });

  it("uses the naira floor on small bills and the percentage on large ones", () => {
    const rule = { minNaira: 50, percentOfExpected: 0.01 };
    expect(toleranceKobo(toKobo(4300), rule)).toBe(toKobo(50));
    expect(toleranceKobo(toKobo(31980.18), rule)).toBe(toKobo(319.8));
  });
});
