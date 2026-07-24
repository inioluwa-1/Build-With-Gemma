"use client";

import { useRef } from "react";
import { t, type Lang } from "@/lib/i18n";
import { ACCEPTED_TYPES } from "@/lib/upload";

/**
 * Home / Capture — the stitch split layout (stitch_designs/vernac_variant_split).
 *
 * A two-column hero on wide screens: the editorial headline and the "VERIFIED."
 * seal on the left, the capture module on the right; two VERIFY / EXPLAIN cards
 * below. On a phone it stacks to one column, headline then capture then cards.
 *
 * Three ways in, in descending order of how most people arrive: photograph it,
 * upload a file someone sent, or type it. The manual fallback is a visible link,
 * not a failure state — extraction recovery lands here, so the path is familiar.
 *
 * The tier cards state the verify/explain boundary on the way in, so a plain
 * interpretation is never mistaken for a verdict on the way out (PRD §1). No
 * green, no red — those belong to verdicts alone (design.md §2).
 */
export function Capture({
  lang,
  online,
  onFile,
  onManual,
}: {
  lang: Lang;
  online: boolean;
  onFile: (file: File) => void;
  onManual: () => void;
}) {
  const camera = useRef<HTMLInputElement>(null);
  const upload = useRef<HTMLInputElement>(null);

  const pick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onFile(file);
    event.target.value = "";
  };

  // The tagline is two sentences — the claim and its seal ("… tongue." +
  // "Verified."). Split on the last sentence boundary so the whole final
  // sentence becomes the seal, in every language (the Yorùbá seal is four
  // words, not one).
  const tagline = t("app.tagline", lang);
  const boundary = tagline.lastIndexOf(". ");
  const headline = boundary === -1 ? tagline : tagline.slice(0, boundary + 1);
  const seal = boundary === -1 ? null : tagline.slice(boundary + 2);

  return (
    <div className="flex flex-1 flex-col pt-6 pb-8">
      <section className="grid grid-cols-1 items-center gap-8 py-4 lg:grid-cols-2 lg:gap-16 lg:py-8">
        {/* Left: the claim */}
        <div className="flex flex-col items-start gap-5">
          <h1 className="font-serif text-[2rem] leading-[1.15] font-bold text-balance lg:text-5xl">
            {headline}
          </h1>
          {seal && (
            <span className="verified-box font-serif text-2xl font-bold uppercase lg:text-[2rem]">
              {seal}
            </span>
          )}
          <p className="text-body text-ink/70 pt-2 italic">{t("app.hook", lang)}</p>
        </div>

        {/* Right: the capture module */}
        <div className="flex w-full flex-col gap-4">
          {/* `capture="environment"` opens the rear camera directly — maximum
              Android compatibility, no getUserMedia permission dance. It bypasses
              the file browser, which is why uploading is its own input. */}
          <input
            ref={camera}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={pick}
          />
          <input ref={upload} type="file" accept={ACCEPTED_TYPES} className="sr-only" onChange={pick} />

          <button
            type="button"
            disabled={!online}
            onClick={() => camera.current?.click()}
            className="bg-ink text-paper group flex min-h-12 w-full flex-col items-center justify-center gap-4 rounded-xl px-6 py-10 transition-transform hover:-translate-y-0.5 disabled:opacity-40"
          >
            <span className="border-band-yellow flex h-16 w-16 items-center justify-center rounded-full border-2 transition-transform group-hover:scale-110">
              <CameraIcon />
            </span>
            <span className="font-serif text-title">{t("capture.cta", lang)}</span>
          </button>

          <button
            type="button"
            disabled={!online}
            onClick={() => upload.current?.click()}
            className="border-ink/25 text-body hover:bg-ink/[0.03] flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 py-4 font-medium transition-colors disabled:opacity-40"
          >
            <UploadIcon />
            {t("capture.upload", lang)}
            <span className="text-ink/50 text-small font-normal">{t("capture.uploadHint", lang)}</span>
          </button>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={onManual}
              className="border-ink text-body hover:text-ink/70 flex min-h-12 w-fit items-center gap-1 border-b font-medium"
            >
              {t("capture.manual", lang)}
              <ArrowIcon />
            </button>
          </div>

          {!online && (
            <p className="text-caution-amber text-small text-center">{t("capture.offline", lang)}</p>
          )}
        </div>
      </section>

      {/* The flow at a glance — fills the space between hero and footer with
          something useful rather than blank paper. */}
      <section aria-label={t("home.stepsLabel", lang)} className="pt-10 lg:pt-14">
        <div className="border-ink/15 mb-5 flex items-center gap-3 border-b pb-2">
          <h2 className="font-display text-small tracking-widest uppercase">
            {t("home.stepsLabel", lang)}
          </h2>
        </div>
        <ol className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          <Step n={1} title={t("home.step1.title", lang)} body={t("home.step1.body", lang)} />
          <Step n={2} title={t("home.step2.title", lang)} body={t("home.step2.body", lang)} />
          <Step n={3} title={t("home.step3.title", lang)} body={t("home.step3.body", lang)} />
        </ol>
      </section>

      {/* Feature band + trust line settle at the bottom, footer-like. */}
      <div className="mt-auto flex flex-col gap-4 pt-10">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Tier
            label={t("capture.tierVerifyLabel", lang)}
            body={t("capture.tierVerifyBody", lang)}
            chip="bg-band-yellow/25"
            icon={<CheckIcon />}
          />
          <Tier
            label={t("capture.tierExplainLabel", lang)}
            body={t("capture.tierExplainBody", lang)}
            chip="bg-ink/10"
            icon={<ListIcon />}
          />
        </section>

        <p className="text-small text-ink/60">{t("capture.trust", lang)}</p>
      </div>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="flex flex-col gap-2">
      <span
        aria-hidden
        className="border-ink/30 font-display text-small flex h-9 w-9 items-center justify-center rounded-full border"
      >
        {n}
      </span>
      <h3 className="font-serif text-lead font-bold">{title}</h3>
      <p className="text-body text-ink/70">{body}</p>
    </li>
  );
}

function Tier({
  label,
  body,
  chip,
  icon,
}: {
  label: string;
  body: string;
  chip: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="border-ink/15 bg-ink/[0.03] flex flex-col gap-3 rounded-xl border p-5">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded ${chip}`}
        >
          {icon}
        </span>
        <h3 className="font-display text-small tracking-widest uppercase">{label}</h3>
      </div>
      <p className="text-body text-ink/75">{body}</p>
    </div>
  );
}

/* Inline SVGs — no external icon font, so the app stays self-contained,
   offline-capable and within the JS budget (design.md §4). */

function CameraIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-8 w-8 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    >
      <path d="M3 8h3.5l1.5-2h8l1.5 2H21v11H3z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="text-ink/60 h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 15V4M8 8l4-4 4 4" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="text-ink h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="text-ink h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 6h12M8 12h12M8 18h12M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </svg>
  );
}
