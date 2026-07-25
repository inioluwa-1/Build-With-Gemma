"use client";

import { useState } from "react";
import { whatsappLink } from "@/lib/complaint";
import { t, type Lang } from "@/lib/i18n";

/**
 * Complaint draft (design.md §3.4).
 *
 * Reachable only from a verified discrepancy. Two actions, both of which hand
 * the message to the user: copy, or open WhatsApp with it prefilled. Vernac
 * never sends anything on anyone's behalf.
 */
export function ComplaintDraft({
  formalEnglish,
  translated,
  lang,
  onBack,
}: {
  formalEnglish: string;
  /** Model-polished version in the user's language; absent if the call failed. */
  translated: string | null;
  lang: Lang;
  onBack: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const shareText = translated ? `${translated}\n\n—\n\n${formalEnglish}` : formalEnglish;

  const copy = async () => {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-1 flex-col gap-5 py-6">
      <h1 className="font-display text-title">{t("complaint.title", lang)}</h1>

      {translated && lang !== "en" && (
        <pre className="border-ink/20 text-body bg-paper rounded-xl border p-4 font-sans whitespace-pre-wrap">
          {translated}
        </pre>
      )}

      <section>
        {lang !== "en" && (
          <h2 className="text-small text-ink/70 mb-1">{t("complaint.formalEnglish", lang)}</h2>
        )}
        <pre className="border-ink/20 text-body bg-paper rounded-xl border p-4 font-sans whitespace-pre-wrap">
          {formalEnglish}
        </pre>
      </section>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={copy}
          className="border-ink text-body min-h-12 flex-1 rounded-xl border-2 py-3 font-medium"
        >
          {copied ? t("complaint.copied", lang) : t("complaint.copy", lang)}
        </button>
        <a
          href={whatsappLink(shareText)}
          target="_blank"
          rel="noreferrer"
          className="bg-ink text-paper text-body flex min-h-12 flex-1 items-center justify-center rounded-xl py-3 font-medium"
        >
          {t("complaint.whatsapp", lang)}
        </a>
      </div>

      <p className="text-small text-ink/60">{t("complaint.note", lang)}</p>

      <button
        type="button"
        onClick={onBack}
        className="text-body mt-auto min-h-12 underline underline-offset-4"
      >
        {t("action.back", lang)}
      </button>
    </div>
  );
}
