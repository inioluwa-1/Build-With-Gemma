"use client";

import { t, type Lang } from "@/lib/i18n";
import type { StringKey } from "@/lib/i18n/en";

/**
 * The signature element (design.md §1): a stamp-style seal, angled, bordered,
 * uppercase. It is the one memorable moment on screen, so everything around it
 * stays quiet.
 *
 * Stamps are reserved for verified verdicts. Nothing on the interpretation tier
 * can reach this component — see InterpretationHeader, which is deliberately
 * built to look like its opposite.
 */

type StampStatus = "checks_out" | "discrepancy" | "cannot_verify";

interface Props {
  status: StampStatus;
  /** Signed. Positive means overcharged; the wording follows the sign. */
  difference?: number;
  lang: Lang;
}

const STYLES: Record<StampStatus, string> = {
  checks_out: "text-verify-green border-verify-green",
  discrepancy: "text-alert-red border-alert-red",
  cannot_verify: "text-caution-amber border-caution-amber",
};

function label(status: StampStatus, difference: number | undefined): StringKey {
  if (status === "checks_out") return "stamp.checksOut";
  if (status === "cannot_verify") return "stamp.cannotVerify";
  // Stamping "OVERCHARGED" on an undercharge would be a false accusation in
  // reverse — exactly the failure the product exists to avoid.
  return (difference ?? 0) > 0 ? "stamp.overcharged" : "stamp.mismatch";
}

export function VerdictStamp({ status, difference, lang }: Props) {
  return (
    <div className="flex justify-center py-6">
      <div
        role="status"
        aria-live="assertive"
        className={`stamp-land font-display text-title border-4 px-6 py-3 text-center uppercase ${STYLES[status]}`}
        style={{ transform: "rotate(-3deg)" }}
      >
        {t(label(status, difference), lang)}
      </div>
    </div>
  );
}
