"use client";

import { languageName, t } from "@/lib/i18n";
import { TOGGLE_LANGS, type Lang } from "@/lib/i18n/types";

/**
 * Persistent, top right (design.md §3.1).
 *
 * All three languages are generated in a single model pass, so switching is a
 * client-side swap with no second request — which is what makes the live Pidgin
 * reveal instant during the demo.
 */
export function LanguageToggle({
  lang,
  onChange,
}: {
  lang: Lang;
  onChange: (lang: Lang) => void;
}) {
  return (
    <div
      role="group"
      aria-label={t("lang.label", lang)}
      className="border-ink/30 flex overflow-hidden rounded-md border"
    >
      {TOGGLE_LANGS.map((option) => {
        const active = option === lang;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={active}
            aria-label={languageName(option)}
            className={`text-small min-h-12 px-3 font-medium ${
              active ? "bg-band-yellow text-ink" : "text-ink/70"
            }`}
          >
            {t(`lang.${option}`, lang)}
          </button>
        );
      })}
    </div>
  );
}
