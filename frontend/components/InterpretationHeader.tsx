"use client";

import { t, type Lang } from "@/lib/i18n";

/**
 * The second-tier element (design.md §1).
 *
 * Every difference from VerdictStamp is deliberate: flat ink band, full width,
 * no rotation, no seal border, no animation, and neither green nor red. The
 * visual grammar *is* the trust model — a stamp means checked against published
 * rules, this band means translated and explained, nothing more. Someone who has
 * seen both once can never confuse them.
 */
export function InterpretationHeader({ lang }: { lang: Lang }) {
  return (
    <div
      role="status"
      aria-live="assertive"
      className="bg-ink text-paper font-display text-lead -mx-4 px-4 py-3 uppercase"
    >
      {t("interpretation.header", lang)}
    </div>
  );
}
