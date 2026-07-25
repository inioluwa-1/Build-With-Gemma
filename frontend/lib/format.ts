/**
 * Deterministic formatters — no `Intl`, so server and client always agree and
 * the math column always aligns under `font-variant-numeric: tabular-nums`.
 */

function group(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Always two decimals: precision is the point of the shown work. */
export function formatNaira(value: number): string {
  const [whole, frac] = Math.abs(value).toFixed(2).split(".");
  return `${value < 0 ? "−" : ""}₦${group(whole)}.${frac}`;
}

/** A money value without the currency mark — used for rates inside a label. */
export function formatAmount(value: number): string {
  const [whole, frac] = Math.abs(value).toFixed(2).split(".");
  return `${value < 0 ? "−" : ""}${group(whole)}.${frac}`;
}

/** kWh and similar: trailing zeros dropped, thousands grouped. */
export function formatNumber(value: number): string {
  const fixed = Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
  const [whole, frac] = fixed.split(".");
  return frac ? `${group(whole)}.${frac}` : group(whole);
}

/** "2025-12-07" → "7 December 2025". Rule-source dates are read, not parsed. */
export function formatDate(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return iso;
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const [, year, month, day] = match;
  return `${Number(day)} ${months[Number(month) - 1]} ${year}`;
}
