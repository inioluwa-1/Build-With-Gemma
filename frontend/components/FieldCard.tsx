"use client";

import { fieldInline, t, type Lang } from "@/lib/i18n";
import type { StringKey } from "@/lib/i18n/en";

/**
 * One editable extracted field on the Confirm screen.
 *
 * A field the model read confidently is prefilled in ink. A field it could not
 * read renders empty with an amber border and a plain-language ask — never a
 * guessed number sitting in a box that looks just like a confident one. This
 * distinction is the hallucination defense made visible (design.md §3.2).
 */
export function FieldCard({
  labelKey,
  value,
  onChange,
  lang,
  confident = true,
  type = "text",
  options,
  optional = false,
}: {
  labelKey: StringKey;
  value: string;
  onChange: (value: string) => void;
  lang: Lang;
  confident?: boolean;
  type?: "text" | "number";
  options?: Array<{ value: string; label: string }>;
  optional?: boolean;
}) {
  const label = t(labelKey, lang);
  const asking = !confident;
  const border = asking ? "border-caution-amber border-2" : "border-ink/30 border";

  return (
    <label className="block">
      <span className="text-small font-medium">{label}</span>
      {options ? (
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`text-body bg-paper mt-1 min-h-12 w-full rounded-lg px-3 ${border}`}
        >
          <option value="">—</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          inputMode={type === "number" ? "decimal" : undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`text-body bg-paper mt-1 min-h-12 w-full rounded-lg px-3 ${border}`}
        />
      )}
      {asking && (
        <span className="text-caution-amber text-small mt-1 block">
          {t("confirm.lowConfidence", lang, {
            field: fieldInline(labelKey.replace("field.", ""), lang),
          })}
        </span>
      )}
      {!asking && optional && (
        <span className="text-ink/60 text-small mt-1 block">{t("confirm.optional", lang)}</span>
      )}
    </label>
  );
}
