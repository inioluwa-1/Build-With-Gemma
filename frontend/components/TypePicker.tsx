"use client";

import { t, type Lang } from "@/lib/i18n";
import type { StringKey } from "@/lib/i18n/en";
import type { DocumentType } from "@/lib/verify/types";

/**
 * Manual entry starts with a document-type pick, because classification cannot
 * run without a photo (design.md §3.1). This screen is also where extraction
 * failure lands — the same familiar path, not a consolation prize.
 */
const CHOICES: DocumentType[] = [
  "electricity_bill",
  "tenancy_document",
  "government_notice",
  "loan_or_financial",
  "wage_statement",
  "legal_document",
  "other",
];

export function TypePicker({
  lang,
  notice,
  onPick,
}: {
  lang: Lang;
  notice: StringKey | null;
  onPick: (documentType: DocumentType) => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-6 py-6">
      {notice && (
        <p role="status" className="border-caution-amber text-body rounded-xl border-2 p-4">
          {t(notice, lang)}
        </p>
      )}

      <header>
        <h1 className="font-display text-title">{t("manual.title", lang)}</h1>
        <p className="text-body text-ink/70 mt-1">{t("manual.hint", lang)}</p>
      </header>

      <div className="flex flex-col gap-3">
        {CHOICES.map((choice) => (
          <button
            key={choice}
            type="button"
            onClick={() => onPick(choice)}
            className="border-ink/30 text-body min-h-12 rounded-xl border px-4 py-4 text-left capitalize"
          >
            {t(`doctype.${choice}` as StringKey, lang)}
          </button>
        ))}
      </div>
    </div>
  );
}
