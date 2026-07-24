"use client";

import { MathLines } from "./MathLines";
import { VerdictStamp } from "./VerdictStamp";
import { formatDate, formatNaira } from "@/lib/format";
import { fieldInline, t, type Lang } from "@/lib/i18n";
import type { StringKey } from "@/lib/i18n/en";
import { OUTPUT_LANGS, OUTPUT_LANG_NAMES, type OutputLang } from "@/lib/i18n/output-langs";
import { getNercTable } from "@/lib/rulesets";
import type { Explanation } from "@/lib/schemas/explain";
import type { ConfirmedDocument, Verdict } from "@/lib/verify/types";

/** The uploaded file, when there was one — shown as a preview in the report sidebar. */
export type Source = { mimeType: string; data: string } | null;

/**
 * Result (design.md §3.3), both tiers.
 *
 * The switch below is the tier boundary. `interpretation_only` cannot reach
 * VerdictStamp, cannot reach the complaint button, and cannot reach green or
 * red — not because the copy says so, but because the discriminated union makes
 * those branches unreachable.
 */
export function Result({
  verdict,
  doc,
  explanation,
  explaining,
  explainFailed,
  lang,
  interpLang,
  onInterpLang,
  source,
  onComplaint,
  onStartOver,
}: {
  verdict: Verdict;
  doc: ConfirmedDocument;
  explanation: Explanation | null;
  explaining: boolean;
  explainFailed: boolean;
  lang: Lang;
  /** Language the interpretation report is rendered in (interpretation tier only). */
  interpLang: OutputLang;
  onInterpLang: (next: OutputLang) => void;
  source: Source;
  onComplaint: () => void;
  onStartOver: () => void;
}) {
  if (verdict.status === "interpretation_only") {
    return (
      <Interpretation
        doc={doc}
        explanation={explanation}
        explaining={explaining}
        explainFailed={explainFailed}
        lang={lang}
        interpLang={interpLang}
        onInterpLang={onInterpLang}
        source={source}
        onStartOver={onStartOver}
      />
    );
  }

  return (
    <Verified
      verdict={verdict}
      explanation={explanation}
      explaining={explaining}
      explainFailed={explainFailed}
      lang={lang}
      onComplaint={onComplaint}
      onStartOver={onStartOver}
    />
  );
}

type VerifiedVerdict = Exclude<Verdict, { status: "interpretation_only" }>;

function Verified({
  verdict,
  explanation,
  explaining,
  explainFailed,
  lang,
  onComplaint,
  onStartOver,
}: {
  verdict: VerifiedVerdict;
  explanation: Explanation | null;
  explaining: boolean;
  explainFailed: boolean;
  lang: Lang;
  onComplaint: () => void;
  onStartOver: () => void;
}) {
  if (verdict.status === "cannot_verify") {
    return (
      <div className="flex flex-1 flex-col gap-6 py-6">
        <VerdictStamp status="cannot_verify" lang={lang} />
        <p className="font-display text-lead text-center">
          {verdict.reason === "no_published_rate"
            ? t("result.noPublishedRate", lang)
            : t("result.cannotVerify", lang, {
                fields: verdict.missing.map((field) => fieldInline(field, lang)).join(", "),
              })}
        </p>
        <StartOver lang={lang} onStartOver={onStartOver} />
      </div>
    );
  }

  const overcharged = verdict.status === "discrepancy" && verdict.difference > 0;
  const headline: StringKey =
    verdict.status === "checks_out"
      ? "result.checksOut"
      : overcharged
        ? "result.overcharged"
        : "result.mismatch";

  const bandRule = getNercTable().bands[verdict.band];

  return (
    <div className="flex flex-1 flex-col gap-6 py-6">
      <VerdictStamp
        status={verdict.status}
        difference={verdict.status === "discrepancy" ? verdict.difference : undefined}
        lang={lang}
      />

      <p className="font-display text-lead text-center">{t(headline, lang)}</p>

      <MathLines math={verdict.math} lang={lang} />

      {/* Surfaced, never asserted: supply hours cannot be verified from the
          document, so this is offered as a complaint ground (PRD §6). */}
      <p className="text-caution-amber text-small">
        {t("bandNote.complaintGround", lang, {
          band: verdict.band,
          hours: bandRule.minSupplyHours,
        })}
      </p>

      <Prose
        explanation={explanation}
        explaining={explaining}
        explainFailed={explainFailed}
        lang={lang}
        failureKey="error.explainFailed"
      />

      {/* Only a proven discrepancy earns a complaint. */}
      {verdict.status === "discrepancy" && (
        <button
          type="button"
          onClick={onComplaint}
          className="border-alert-red text-alert-red font-display text-lead min-h-12 w-full rounded-xl border-2 py-4"
        >
          {t("complaint.cta", lang)}
        </button>
      )}

      <p className="text-small text-ink/60 mt-auto">
        {t("trust.verified", lang, {
          source: verdict.source,
          date: formatDate(verdict.effectiveDate),
        })}
      </p>

      <StartOver lang={lang} onStartOver={onStartOver} />
    </div>
  );
}

/**
 * Interpretation tier, rendered as a Document Analysis Report
 * (stitch_designs/explanation_page). A serif document title with the
 * EXPLAINED — NOT VERIFIED badge, a "What this is" sidebar, and a numbered
 * clause-by-clause breakdown.
 *
 * The whole report re-renders from `sections[lang]`, so the language toggle is
 * an instant swap. Nothing here can reach a stamp, green, or red — the tier
 * boundary is the discriminated union, and green/red are reserved for verdicts
 * (design.md §2), so even "missing data" is flagged in amber, not red.
 */
function Interpretation({
  doc,
  explanation,
  explaining,
  explainFailed,
  lang,
  interpLang,
  onInterpLang,
  source,
  onStartOver,
}: {
  doc: ConfirmedDocument;
  explanation: Explanation | null;
  explaining: boolean;
  explainFailed: boolean;
  lang: Lang;
  interpLang: OutputLang;
  onInterpLang: (next: OutputLang) => void;
  source: Source;
  onStartOver: () => void;
}) {
  const isInterpretation = explanation?.kind === "interpretation";
  // Chrome (headings, labels) stays in the app language `lang`; the report body
  // is rendered in the separately chosen `interpLang`.
  const sections = isInterpretation ? explanation.sections[interpLang] : null;
  // The report exists in some language but not this one yet — a toggle landed
  // ahead of the background fetch, which is now being filled in on demand.
  const switchingLanguage = isInterpretation && !sections;
  const facts = doc.documentType === "electricity_bill" ? null : doc;
  // Before the model answers, fall back to the document-type label so the
  // header is never blank.
  const title = sections?.title ?? t(`doctype.${doc.documentType}` as StringKey, lang);
  const imageSrc =
    source && source.mimeType.startsWith("image/")
      ? `data:${source.mimeType};base64,${source.data}`
      : null;

  return (
    <div className="flex flex-1 flex-col py-6">
      <header className="border-ink/25 mb-8 border-b pb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-serif text-[2rem] leading-tight font-bold lg:text-[2.5rem]">
              {title}
            </h1>
            <p className="text-body text-ink/60 mt-1">{t("interp.reportSubtitle", lang)}</p>
          </div>
          {/* The flat dark badge — never a stamp: no seal, no rotation, no
              colour. The grammar itself says "explained, not verified". */}
          <span
            role="status"
            aria-live="assertive"
            className="bg-ink text-paper font-display text-small w-fit px-5 py-2.5 tracking-widest whitespace-nowrap uppercase"
          >
            {t("interpretation.header", lang)}
          </span>
        </div>
      </header>

      {/* The report's output language — chosen independently of the app UI, so
          a reader can keep the app in one language and read the document in
          another. Picking a language not fetched yet triggers an on-demand
          fetch (page.tsx) and the "putting it in your language" state below. */}
      <label className="mb-8 flex items-center gap-2">
        <span className="text-small text-ink/70">{t("interp.readIn", lang)}</span>
        <select
          value={interpLang}
          onChange={(event) => onInterpLang(event.target.value as OutputLang)}
          className="border-ink/30 text-body bg-paper min-h-12 rounded-md border px-2 font-medium"
        >
          {OUTPUT_LANGS.map((code) => (
            <option key={code} value={code}>
              {OUTPUT_LANG_NAMES[code]}
            </option>
          ))}
        </select>
      </label>

      {(explaining || switchingLanguage) && !sections && (
        <p className="text-body text-ink/70">{t("status.explaining", lang)}</p>
      )}
      {explainFailed && !isInterpretation && (
        <p className="text-caution-amber text-body">{t("error.explainOnlyFailed", lang)}</p>
      )}

      {sections && (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <aside className="flex flex-col gap-6 md:col-span-1">
            <div className="border-ink/15 bg-ink/[0.03] border p-5">
              <h2 className="font-display text-small text-caution-amber mb-3 tracking-widest uppercase">
                {t("interp.whatThisIs", lang)}
              </h2>
              <p className="font-serif text-lead leading-relaxed">{sections.whatThisIs}</p>

              {facts && (facts.issuer || facts.subject) && (
                <dl className="mt-6 flex flex-col">
                  {facts.issuer && <MetaRow label={t("interp.sentBy", lang)} value={facts.issuer} />}
                  {facts.subject && <MetaRow label={t("interp.about", lang)} value={facts.subject} />}
                </dl>
              )}
            </div>

            {imageSrc && (
              <figure>
                <figcaption className="font-display text-small text-ink/50 mb-2 tracking-widest uppercase">
                  {t("interp.sourceLabel", lang)}
                </figcaption>
                {/* A user-supplied preview via data URL — plain img, not
                    next/image, which does not handle data URLs. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc}
                  alt=""
                  className="border-ink/15 max-h-72 w-full border object-cover grayscale"
                />
              </figure>
            )}

            <AmountsAndDates facts={facts} lang={lang} />
          </aside>

          <article className="md:col-span-2">
            <div className="mb-6">
              <h2 className="font-serif text-title font-bold">{t("interp.whatItSays", lang)}</h2>
              <p className="text-body text-ink/70 mt-2">{sections.overview}</p>
            </div>

            <ol>
              {sections.clauses.map((clause, index) => (
                <li
                  key={index}
                  className="border-ink/12 flex flex-col gap-4 border-t py-6 md:flex-row md:gap-6"
                >
                  <span
                    aria-hidden
                    className={`font-serif text-lead flex h-11 w-11 shrink-0 items-center justify-center font-bold ${
                      index % 2 === 0 ? "bg-band-yellow text-ink" : "bg-ink/10 text-ink"
                    }`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="font-display text-small text-caution-amber mb-1 tracking-widest uppercase">
                      {clause.heading}
                    </h3>
                    <ClauseText body={clause.detail} />
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-8 flex flex-col gap-4">
              <Callout label={t("interp.whatItAsks", lang)} body={sections.whatItAsks} tone="ink" />
              <Callout label={t("interp.watchOut", lang)} body={sections.watchOut} tone="amber" />
            </div>
          </article>
        </div>
      )}

      <p className="text-small text-ink/60 mt-8">{t("trust.interpretation", lang)}</p>
      <div className="mt-6">
        <StartOver lang={lang} onStartOver={onStartOver} />
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-ink/15 flex justify-between gap-3 border-b py-2 last:border-0">
      <dt className="text-small text-ink/60 uppercase">{label}</dt>
      <dd className="text-small text-right">{value}</dd>
    </div>
  );
}

/** Amounts and dates from the confirmed facts, under "(listed, not checked)". */
function AmountsAndDates({
  facts,
  lang,
}: {
  facts: Exclude<ConfirmedDocument, { documentType: "electricity_bill" }> | null;
  lang: Lang;
}) {
  if (!facts || (facts.amounts.length === 0 && facts.dates.length === 0)) return null;
  return (
    <div className="border-ink/15 border p-5">
      <h2 className="font-display text-small mb-3 tracking-widest uppercase">
        {t("interp.amounts", lang)}{" "}
        <span className="text-ink/50 font-sans font-normal normal-case">
          {t("interpretation.amountsNote", lang)}
        </span>
      </h2>
      <dl className="flex flex-col">
        {facts.amounts.map((amount, index) => (
          <MetaRow key={`a${index}`} label={amount.label} value={formatNaira(amount.value)} />
        ))}
        {facts.dates.map((date, index) => (
          <MetaRow key={`d${index}`} label={date.label} value={date.value} />
        ))}
      </dl>
    </div>
  );
}

function Callout({ label, body, tone }: { label: string; body: string; tone: "ink" | "amber" }) {
  const border = tone === "amber" ? "border-caution-amber" : "border-ink/40";
  return (
    <section className={`bg-ink/[0.02] border-l-4 py-3 pr-3 pl-4 ${border}`}>
      <h3 className="font-display text-small mb-1 tracking-widest uppercase">{label}</h3>
      <ClauseText body={body} />
    </section>
  );
}

/**
 * A clause detail: newlines become separate lines, **bold** marks sub-labels,
 * and a leading "MISSING DATA:" is flagged in amber (never red — red belongs to
 * verified verdicts alone, design.md §2).
 */
function ClauseText({ body }: { body: string }) {
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return (
    <div className="flex flex-col gap-1.5">
      {lines.map((line, index) => (
        <p key={index} className="text-body leading-relaxed">
          <Inline text={line} />
        </p>
      ))}
    </div>
  );
}

function Inline({ text }: { text: string }) {
  const missing = text.match(/^(MISSING DATA:)\s*(.*)$/i);
  if (missing) {
    return (
      <>
        <span className="text-caution-amber font-bold">{missing[1]}</span> <Bold text={missing[2]} />
      </>
    );
  }
  return <Bold text={text} />;
}

/** Renders **bold** segments inside an otherwise plain string. */
function Bold({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, index) => {
        const match = part.match(/^\*\*([^*]+)\*\*$/);
        return match ? <strong key={index}>{match[1]}</strong> : <span key={index}>{part}</span>;
      })}
    </>
  );
}

function Prose({
  explanation,
  explaining,
  explainFailed,
  lang,
  failureKey,
}: {
  explanation: Explanation | null;
  explaining: boolean;
  explainFailed: boolean;
  lang: Lang;
  failureKey: StringKey;
}) {
  if (explaining) return <p className="text-body text-ink/70">{t("status.explaining", lang)}</p>;
  if (explanation?.kind === "verdict") {
    return <p className="text-body whitespace-pre-line">{explanation.text[lang]}</p>;
  }
  // The explanation is a courtesy; the math above stands without it.
  if (explainFailed) return <p className="text-caution-amber text-small">{t(failureKey, lang)}</p>;
  return null;
}

function StartOver({ lang, onStartOver }: { lang: Lang; onStartOver: () => void }) {
  return (
    <button
      type="button"
      onClick={onStartOver}
      className="text-body min-h-12 underline underline-offset-4"
    >
      {t("action.startOver", lang)}
    </button>
  );
}
