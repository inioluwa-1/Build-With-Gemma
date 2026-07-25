import { formatDate, formatNaira, formatNumber } from "./format";
import type { ConfirmedBill, MathLine, Verdict } from "./verify/types";

export type DiscrepancyVerdict = Extract<Verdict, { status: "discrepancy" }>;

function lineValue(math: MathLine[], key: MathLine["key"]): number | null {
  return math.find((line) => line.key === key)?.value ?? null;
}

/**
 * The complaint is template-first (technical.md §7): every number is
 * interpolated deterministically from the verdict, and the model is only ever
 * asked to make the wording read naturally. If the polish call fails, this
 * text ships as-is — the feature never blocks on the model.
 *
 * Always formal English: complaints go to the DisCo, and the DisCo reads English.
 */
export function complaintTemplate(verdict: DiscrepancyVerdict, bill: ConfirmedBill): string {
  const energy = lineValue(verdict.math, "math.energy");
  const vat = lineValue(verdict.math, "math.vat");
  const arrears = lineValue(verdict.math, "math.arrears");
  const overcharged = verdict.difference > 0;

  const lines = [
    `Subject: Query on my electricity bill — Band ${verdict.band} account`,
    "",
    "Dear Customer Care,",
    "",
    `I am writing about my most recent electricity bill${
      bill.readingType ? ` (${bill.readingType} reading)` : ""
    }.`,
    "",
    `The bill records ${formatNumber(bill.unitsKwh ?? 0)} kWh on a Band ${verdict.band} tariff.`,
  ];

  if (energy !== null) {
    lines.push(
      `At the published Band ${verdict.band} rate, the energy charge comes to ${formatNaira(energy)}${
        vat !== null ? `, plus VAT of ${formatNaira(vat)}` : ""
      }, giving ${formatNaira(verdict.expected)}.`,
    );
  }

  if (arrears !== null && arrears > 0) {
    lines.push(
      `Setting aside the arrears of ${formatNaira(arrears)}, which I am not disputing, I was charged ${formatNaira(verdict.charged)} for this month's energy.`,
    );
  } else {
    lines.push(`I was charged ${formatNaira(verdict.charged)}.`);
  }

  lines.push(
    "",
    overcharged
      ? `That is ${formatNaira(Math.abs(verdict.difference))} more than the published rate gives.`
      : `That is ${formatNaira(Math.abs(verdict.difference))} less than the published rate gives, and I would like the bill clarified.`,
    "",
    `This is measured against the ${verdict.source}, effective ${formatDate(verdict.effectiveDate)}.`,
    "",
    "Please review this bill and let me know the outcome.",
    "",
    "Account/meter number: ______________",
    "Name: ______________",
  );

  return lines.join("\n");
}

export function whatsappLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
