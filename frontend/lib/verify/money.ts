/**
 * Money is computed in integer kobo, never in floating-point naira.
 *
 * `29749 × 0.075` evaluates to 2231.1749999999997 in binary floating point,
 * which rounds to ₦2,231.17 where the decimal answer is ₦2,231.18. A kobo of
 * drift never changes a verdict — the tolerance band is orders of magnitude
 * wider — but it does put a wrong number on screen, and the whole product
 * rests on the shown work being exactly right.
 */

const KOBO_PER_NAIRA = 100;
/** Rates are scaled to basis points so the multiply stays integer-exact. */
const BASIS_POINTS = 10_000;

export function toKobo(naira: number): number {
  return Math.round(naira * KOBO_PER_NAIRA);
}

export function toNaira(kobo: number): number {
  return kobo / KOBO_PER_NAIRA;
}

/** Apply a fractional rate (e.g. 0.075) to a kobo amount, half-up. */
export function applyRate(kobo: number, rate: number): number {
  return Math.round((kobo * Math.round(rate * BASIS_POINTS)) / BASIS_POINTS);
}

/**
 * Tolerance absorbs kobo rounding and small fixed sundries so that correct
 * bills verify as correct (technical.md §5). Returned in kobo.
 */
export function toleranceKobo(
  expectedTotalKobo: number,
  { minNaira, percentOfExpected }: { minNaira: number; percentOfExpected: number },
): number {
  return Math.max(toKobo(minNaira), Math.round(expectedTotalKobo * percentOfExpected));
}

/** Display helper for values that never passed through the kobo pipeline. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
