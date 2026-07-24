"use client";

import { FieldCard } from "./FieldCard";
import { t, type Lang } from "@/lib/i18n";
import type { StringKey } from "@/lib/i18n/en";
import { isConfident } from "@/lib/confidence";
import type {
  Band,
  ConfirmedBill,
  ConfirmedDocument,
  ConfirmedGenericDocument,
} from "@/lib/verify/types";

/**
 * Confirm (design.md §3.2) — the hallucination firewall, made visible.
 *
 * The tier is declared here, *before* any result exists: this document can be
 * checked, or it can only be explained. The user sees and corrects everything
 * the model read, and a wrong document-type guess is correctable too. Nothing
 * downstream ever sees a number the user has not had the chance to fix.
 */
export function Confirm({
  doc,
  confidence,
  extracted,
  hasSource,
  lang,
  hasRuleset,
  onChange,
  onChangeType,
  onSubmit,
}: {
  doc: ConfirmedDocument;
  confidence: Record<string, number>;
  /** False on the manual path, where nothing was read and nothing can have failed to read. */
  extracted: boolean;
  /** True when a file was uploaded and the model can read it directly. */
  hasSource: boolean;
  lang: Lang;
  hasRuleset: boolean;
  onChange: (doc: ConfirmedDocument) => void;
  onChangeType: () => void;
  onSubmit: () => void;
}) {
  /**
   * The fields exist to be corrected before a number is *verified*. On the
   * interpretation tier nothing is verified and the explanation is written from
   * the document itself, so asking the user to retype what the document is
   * about would be asking them to do the job they uploaded it for. The tier is
   * still declared here, and the type is still correctable.
   */
  const skipFields = !hasRuleset && hasSource;

  if (skipFields) {
    return (
      <div className="flex flex-1 flex-col gap-6 py-6">
        <Header doc={doc} lang={lang} hasRuleset={hasRuleset} onChangeType={onChangeType} />
        <p className="text-body text-ink/80">{t("confirm.explainIntro", lang)}</p>
        <SubmitButton lang={lang} hasRuleset={hasRuleset} onSubmit={onSubmit} />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-6">
      <Header doc={doc} lang={lang} hasRuleset={hasRuleset} onChangeType={onChangeType} />

      <div className="flex flex-col gap-4">
        {doc.documentType === "electricity_bill" ? (
          <BillFields doc={doc} confidence={confidence} extracted={extracted} lang={lang} onChange={onChange} />
        ) : (
          <GenericFields doc={doc} confidence={confidence} extracted={extracted} lang={lang} onChange={onChange} />
        )}
      </div>

      <SubmitButton lang={lang} hasRuleset={hasRuleset} onSubmit={onSubmit} />
    </div>
  );
}

function Header({
  doc,
  lang,
  hasRuleset,
  onChangeType,
}: {
  doc: ConfirmedDocument;
  lang: Lang;
  hasRuleset: boolean;
  onChangeType: () => void;
}) {
  return (
    <header>
      <h1 className="font-display text-title">{t("confirm.title", lang)}</h1>
      {/* The tier is declared before any result exists, so a plain explanation
          is never mistaken for a verdict afterwards. */}
      <p className="text-body text-ink/80 mt-2">
        {hasRuleset
          ? t("confirm.tierRuleset", lang)
          : t("confirm.tierNoRuleset", lang, {
              type: t(`doctype.${doc.documentType}` as StringKey, lang),
            })}
      </p>
      <button
        type="button"
        onClick={onChangeType}
        className="text-small mt-2 min-h-12 underline underline-offset-4"
      >
        {t("confirm.changeType", lang)}
      </button>
    </header>
  );
}

function SubmitButton({
  lang,
  hasRuleset,
  onSubmit,
}: {
  lang: Lang;
  hasRuleset: boolean;
  onSubmit: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSubmit}
      className="bg-ink text-paper font-display text-lead mt-auto min-h-12 w-full rounded-xl py-4"
    >
      {hasRuleset ? t("confirm.submitVerify", lang) : t("confirm.submitExplain", lang)}
    </button>
  );
}

const BANDS: Band[] = ["A", "B", "C", "D", "E"];

function BillFields({
  doc,
  confidence,
  extracted,
  lang,
  onChange,
}: {
  doc: ConfirmedBill;
  confidence: Record<string, number>;
  extracted: boolean;
  lang: Lang;
  onChange: (doc: ConfirmedDocument) => void;
}) {
  const set = <K extends keyof ConfirmedBill>(key: K, value: ConfirmedBill[K]) =>
    onChange({ ...doc, [key]: value });

  /**
   * A field is "asking" only when a model read the document and either could
   * not make out this field or was not sure enough. Manual entry never asks —
   * the user is the source, so an empty box is just an empty box.
   */
  const read = (present: boolean, field: string) =>
    !extracted || (present && isConfident(confidence, field));


  const num = (raw: string): number | null => {
    const cleaned = raw.replace(/[^\d.-]/g, "");
    if (cleaned === "") return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return (
    <>
      <FieldCard
        labelKey="field.band"
        lang={lang}
        value={doc.band ?? ""}
        confident={read(doc.band !== null, "band")}
        options={BANDS.map((band) => ({
          value: band,
          label: t("band.option", lang, { band }),
        }))}
        onChange={(value) => set("band", (value || null) as Band | null)}
      />
      <FieldCard
        labelKey="field.unitsKwh"
        lang={lang}
        type="number"
        value={doc.unitsKwh === null ? "" : String(doc.unitsKwh)}
        confident={read(doc.unitsKwh !== null, "unitsKwh")}
        onChange={(value) => set("unitsKwh", num(value))}
      />
      <FieldCard
        labelKey="field.amountCharged"
        lang={lang}
        type="number"
        value={doc.amountCharged === null ? "" : String(doc.amountCharged)}
        confident={read(doc.amountCharged !== null, "amountCharged")}
        onChange={(value) => set("amountCharged", num(value))}
      />
      <FieldCard
        labelKey="field.arrears"
        lang={lang}
        type="number"
        optional
        value={doc.arrears === null ? "" : String(doc.arrears)}
        onChange={(value) => set("arrears", num(value))}
      />
      <FieldCard
        labelKey="field.readingType"
        lang={lang}
        optional
        value={doc.readingType ?? ""}
        options={[
          { value: "actual", label: t("reading.actual", lang) },
          { value: "estimated", label: t("reading.estimated", lang) },
        ]}
        onChange={(value) => set("readingType", (value || null) as ConfirmedBill["readingType"])}
      />
    </>
  );
}

/** `Label — value` per line: editable without a form builder. */
function linesToPairs(text: string): Array<{ label: string; value: string }> {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split(/\s+[—–-]\s+|:\s+/);
      return { label: label.trim(), value: rest.join(" ").trim() };
    });
}

function GenericFields({
  doc,
  confidence,
  extracted,
  lang,
  onChange,
}: {
  doc: ConfirmedGenericDocument;
  confidence: Record<string, number>;
  extracted: boolean;
  lang: Lang;
  onChange: (doc: ConfirmedDocument) => void;
}) {
  const set = <K extends keyof ConfirmedGenericDocument>(
    key: K,
    value: ConfirmedGenericDocument[K],
  ) => onChange({ ...doc, [key]: value });

  /**
   * A field is "asking" only when a model read the document and either could
   * not make out this field or was not sure enough. Manual entry never asks —
   * the user is the source, so an empty box is just an empty box.
   */
  const read = (present: boolean, field: string) =>
    !extracted || (present && isConfident(confidence, field));


  return (
    <>
      <FieldCard
        labelKey="field.issuer"
        lang={lang}
        value={doc.issuer ?? ""}
        confident={read(Boolean(doc.issuer), "issuer")}
        onChange={(value) => set("issuer", value || null)}
      />
      <FieldCard
        labelKey="field.subject"
        lang={lang}
        value={doc.subject ?? ""}
        confident={read(Boolean(doc.subject), "subject")}
        onChange={(value) => set("subject", value || null)}
      />
      <ListField
        labelKey="field.amounts"
        lang={lang}
        value={doc.amounts.map((a) => `${a.label} — ${a.value}`).join("\n")}
        onChange={(text) =>
          set(
            "amounts",
            linesToPairs(text)
              .map(({ label, value }) => ({
                label,
                value: Number(value.replace(/[^\d.-]/g, "")),
                currency: "NGN",
              }))
              .filter((a) => Number.isFinite(a.value)),
          )
        }
      />
      <ListField
        labelKey="field.dates"
        lang={lang}
        value={doc.dates.map((d) => `${d.label} — ${d.value}`).join("\n")}
        onChange={(text) => set("dates", linesToPairs(text))}
      />
      <ListField
        labelKey="field.obligations"
        lang={lang}
        value={doc.obligations.join("\n")}
        onChange={(text) =>
          set(
            "obligations",
            text
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean),
          )
        }
      />
    </>
  );
}

function ListField({
  labelKey,
  value,
  onChange,
  lang,
}: {
  labelKey: StringKey;
  value: string;
  onChange: (value: string) => void;
  lang: Lang;
}) {
  return (
    <label className="block">
      <span className="text-small font-medium">{t(labelKey, lang)}</span>
      <textarea
        rows={Math.max(2, value.split("\n").length)}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-ink/30 text-body bg-paper mt-1 w-full rounded-lg border px-3 py-2"
      />
    </label>
  );
}

