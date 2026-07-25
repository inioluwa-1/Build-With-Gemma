"use client";

import { formatAmount, formatNaira, formatNumber } from "@/lib/format";
import { t, type Lang } from "@/lib/i18n";
import type { MathLine } from "@/lib/verify/types";

/**
 * The shown work (design.md §3.3).
 *
 * Rendered straight from `Verdict.math`, which the model never touches — the
 * explanation prose can drift, these numbers cannot. Shown on "checks out" too:
 * trust comes from showing the work, not from the verdict alone.
 */
export function MathLines({ math, lang }: { math: MathLine[]; lang: Lang }) {
  return (
    <section aria-label={t("math.header", lang)}>
      <h2 className="font-display text-lead mb-3">{t("math.header", lang)}</h2>
      <dl className="tabular text-body">
        {math.map((line, index) => (
          <Row key={`${line.key}-${index}`} line={line} lang={lang} />
        ))}
      </dl>
    </section>
  );
}

function Row({ line, lang }: { line: MathLine; lang: Lang }) {
  const params = line.params
    ? Object.fromEntries(
        Object.entries(line.params).map(([key, value]) => {
          if (typeof value !== "number") return [key, value];
          // A tariff rate is money and keeps its kobo: "₦209.50", not "₦209.5".
          return [key, key === "rate" ? formatAmount(value) : formatNumber(value)];
        }),
      )
    : undefined;

  return (
    <div className={`flex items-baseline justify-between gap-4 py-1.5 ${ROW_STYLES[line.kind]}`}>
      <dt className={line.kind === "aside" ? "text-small" : undefined}>
        {t(line.key, lang, params)}
      </dt>
      <dd className="shrink-0 font-medium">{line.value === null ? "—" : formatNaira(line.value)}</dd>
    </div>
  );
}

const ROW_STYLES: Record<MathLine["kind"], string> = {
  input: "",
  computed: "",
  // The rule the whole product rests on: arrears are shown, subtracted in the
  // open, and never counted as an error.
  aside: "text-ink/70 border-ink/15 mt-2 border-t pt-2",
  total: "border-ink/30 mt-2 border-t pt-2 font-display",
  difference: "text-alert-red border-ink/30 mt-2 border-t pt-2 font-display text-lead",
};
