"use client";

import { useEffect, useState } from "react";
import { t, type Lang } from "@/lib/i18n";

/**
 * The waiting screen (design.md §5: "progress indicator, cancel available").
 *
 * A static line of text is indistinguishable from a hang, which is exactly how
 * this screen first read. So it shows a moving indicator, counts the seconds
 * out loud, changes its wording once the wait stops being typical, and always
 * offers a way out. Extraction is capped by a deadline in any case — this
 * screen can never outlive it.
 */
const SLOW_AFTER_SECONDS = 12;

export function Reading({ lang, onCancel }: { lang: Lang; onCancel: () => void }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const tick = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(tick);
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <div
        aria-hidden
        className="border-ink/15 border-t-band-yellow h-12 w-12 animate-spin rounded-full border-4"
      />

      <div className="text-center">
        <p className="text-lead" role="status" aria-live="polite">
          {t(seconds >= SLOW_AFTER_SECONDS ? "status.readingSlow" : "status.reading", lang)}
        </p>
        <p className="tabular text-small text-ink/60 mt-1">
          {t("status.elapsed", lang, { seconds })}
        </p>
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="border-ink/30 text-body min-h-12 rounded-xl border px-6"
      >
        {t("status.cancel", lang)}
      </button>
    </div>
  );
}
