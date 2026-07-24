"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Capture } from "@/components/Capture";
import { Reading } from "@/components/Reading";
import { ComplaintDraft } from "@/components/ComplaintDraft";
import { Confirm } from "@/components/Confirm";
import { InstallPrompt } from "@/components/InstallPrompt";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Result } from "@/components/Result";
import { TypePicker } from "@/components/TypePicker";
import { initialState, reducer } from "@/lib/app-state";
import { complaintTemplate, type DiscrepancyVerdict } from "@/lib/complaint";
import { FileTooLargeError, prepareUpload } from "@/lib/upload";
import { t } from "@/lib/i18n";
import { TOGGLE_LANGS } from "@/lib/i18n/types";
import { resolveRuleset } from "@/lib/rulesets";
import { verifyDocument } from "@/lib/verify";
import type { ConfirmedBill, ConfirmedGenericDocument } from "@/lib/verify/types";

/**
 * Extraction runs at `thinkingLevel: MINIMAL` and lands in a few seconds, plus
 * up to two validation retries. This ceiling is generous for a bad connection
 * and still well short of the point where a user concludes the app is broken.
 */
const EXTRACT_TIMEOUT_MS = 45_000;

/**
 * Interpretation writes a full account of the document, so it is the slowest
 * call in the app even when only one language is requested. It gets its own,
 * looser ceiling — but a ceiling, so it can never hang the way extraction did.
 */
const EXPLAIN_TIMEOUT_MS = 60_000;

export default function Home() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const online = useOnline();

  const { doc, verdict, lang } = state;
  const ruleset = doc ? resolveRuleset(doc.documentType) : null;

  // Held so Cancel and the deadline can both abort the in-flight read.
  const extractAbort = useRef<AbortController | null>(null);

  const cancelReading = useCallback(() => {
    extractAbort.current?.abort("cancelled");
    dispatch({ type: "reset" });
  }, []);

  const handleFile = useCallback(async (file: File) => {
    dispatch({ type: "start-reading" });
    const controller = new AbortController();
    extractAbort.current = controller;
    // A hard ceiling on the wait. Without one, a slow or wedged call leaves the
    // user on "Reading your document…" with no end and no explanation.
    const deadline = setTimeout(() => controller.abort("timeout"), EXTRACT_TIMEOUT_MS);

    try {
      const document = await prepareUpload(file);
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: document }),
        signal: controller.signal,
      });
      const payload = await response.json();

      if (!payload.ok) {
        // A missing key or a dead endpoint is a different problem from an
        // unreadable photo, and the copy says which.
        const kind = payload.error?.kind;
        dispatch({
          type: "extract-failed",
          notice:
            kind === "no_api_key" || kind === "network"
              ? "error.modelDown"
              : // The API refused the file itself — a photo of the page will work
                // where the file did, so say that rather than "try more light".
                kind === "rejected"
                ? "error.fileRejected"
                : "error.extractionFailed",
        });
        return;
      }

      // /api/extract already validated this against the Zod schema and would
      // have returned a typed failure otherwise, so it is trusted here — and
      // keeping Zod off the client saves ~50KB of the JS budget. The real
      // defense is the Confirm screen, where the user sees every field before
      // anything is computed from it.
      dispatch({ type: "extracted", extraction: payload.extraction, source: document });
    } catch (error) {
      // `abort(reason)` makes fetch reject with the reason itself, not a
      // DOMException — so the signal is what says why we stopped. Blaming the
      // photo for a timeout would send the user off to retake a fine picture.
      const reason = controller.signal.reason;
      if (reason === "cancelled") return; // Cancel already routed away.
      dispatch({
        type: "extract-failed",
        notice:
          error instanceof FileTooLargeError
            ? "error.fileTooBig"
            : reason === "timeout"
              ? "error.timeout"
              : "error.extractionFailed",
      });
    } finally {
      clearTimeout(deadline);
      extractAbort.current = null;
    }
  }, []);

  const submit = useCallback(async () => {
    if (!doc) return;

    // Verification is local, synchronous and offline-capable. The verdict
    // exists before any network call is attempted.
    const computed = verifyDocument(doc, resolveRuleset(doc.documentType));
    dispatch({ type: "verdict", verdict: computed });

    if (!navigator.onLine) return;
    dispatch({ type: "explaining" });

    const interpretation = computed.status === "interpretation_only";
    const base = interpretation
      ? {
          kind: "interpretation" as const,
          doc: doc as ConfirmedGenericDocument,
          // Send the file when there is one, so the explanation is written from
          // the document rather than from a handful of extracted fields.
          ...(state.source ? { source: state.source } : {}),
        }
      : { kind: "verdict" as const, verdict: computed };

    const ask = (payload: object, signal?: AbortSignal) =>
      fetch("/api/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal,
      }).then((response) => response.json());

    try {
      // A faithful account of a long document costs ~54s across three
      // languages. Fetch the one being read first so the wait is a third of
      // that, then backfill the others while the user is reading.
      const rest = TOGGLE_LANGS.filter((other) => other !== lang);
      const payload = await ask(
        interpretation ? { ...base, langs: [lang] } : base,
        AbortSignal.timeout(EXPLAIN_TIMEOUT_MS),
      );
      if (!payload.ok) {
        dispatch({ type: "explain-failed" });
        return;
      }
      dispatch({
        type: "explained",
        explanation:
          payload.kind === "verdict"
            ? { kind: "verdict", text: payload.explanation }
            : { kind: "interpretation", sections: payload.explanation },
      });

      if (interpretation && rest.length > 0) {
        // Background: a failure here costs the toggle, never the result.
        ask({ ...base, langs: rest }, AbortSignal.timeout(EXPLAIN_TIMEOUT_MS))
          .then((more) => {
            if (more?.ok) dispatch({ type: "explained-more", sections: more.explanation });
          })
          .catch(() => {});
      }
    } catch {
      dispatch({ type: "explain-failed" });
    }
  }, [doc, state.source, lang]);

  // The report's output language is chosen on the result screen, independent of
  // the app UI. submit() fetches the app language first and backfills the other
  // toggle languages; any other language the reader picks from the report's
  // dropdown is fetched here on demand, so the report is never left blank behind
  // a language switch.
  const { interpLang } = state;
  const langRequests = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (state.screen !== "result") return;
    const exp = state.explanation;
    if (exp?.kind !== "interpretation") return; // submit() owns the first language
    if (exp.sections[interpLang]) return; // already have this one
    if (!navigator.onLine || langRequests.current.has(interpLang)) return;
    if (!doc || doc.documentType === "electricity_bill") return;

    langRequests.current.add(interpLang);
    fetch("/api/explain", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "interpretation",
        doc: doc as ConfirmedGenericDocument,
        ...(state.source ? { source: state.source } : {}),
        langs: [interpLang],
      }),
      signal: AbortSignal.timeout(EXPLAIN_TIMEOUT_MS),
    })
      .then((response) => response.json())
      .then((more) => {
        if (more?.ok) dispatch({ type: "explained-more", sections: more.explanation });
      })
      .catch(() => {})
      .finally(() => langRequests.current.delete(interpLang));
  }, [interpLang, state.screen, state.explanation, state.source, doc]);

  const openComplaint = useCallback(async () => {
    if (!doc || doc.documentType !== "electricity_bill") return;
    if (!verdict || verdict.status !== "discrepancy") return;

    // The template is complete before the model is consulted, and ships
    // unchanged if the polish call fails.
    const formalEnglish = complaintTemplate(verdict as DiscrepancyVerdict, doc as ConfirmedBill);
    dispatch({ type: "complaint", formalEnglish, translated: null });

    if (lang === "en" || !navigator.onLine) return;
    try {
      const response = await fetch("/api/complaint", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ template: formalEnglish, lang }),
      });
      const payload = await response.json();
      if (payload.ok) {
        dispatch({ type: "complaint", formalEnglish, translated: payload.text });
      }
    } catch {
      // Silent by design — the English complaint is already on screen.
    }
  }, [doc, verdict, lang]);

  // Two screens use the wide, two-column layout: the home hero and the
  // interpretation report (its Document Analysis Report has a sidebar). The bill
  // flow (confirm, verified result, complaint) stays a single narrow column,
  // read top to bottom on a phone.
  const wide =
    state.screen === "capture" ||
    (state.screen === "result" && state.verdict?.status === "interpretation_only");

  return (
    <main
      className={`mx-auto flex min-h-dvh w-full flex-col px-4 ${wide ? "max-w-5xl" : "max-w-md"}`}
    >
      <header
        className={`flex items-center justify-between py-4 ${wide ? "border-ink/15 border-b" : ""}`}
      >
        <span className="font-serif text-title font-bold">{t("app.name", lang)}</span>
        <LanguageToggle
          lang={lang}
          onChange={(next) => dispatch({ type: "set-lang", lang: next })}
        />
      </header>

      {state.screen === "capture" && (
        <Capture
          lang={lang}
          online={online}
          onFile={handleFile}
          onManual={() => dispatch({ type: "start-manual" })}
        />
      )}

      {state.screen === "reading" && <Reading lang={lang} onCancel={cancelReading} />}

      {state.screen === "type-picker" && (
        <TypePicker
          lang={lang}
          notice={state.notice}
          onPick={(documentType) => dispatch({ type: "pick-type", documentType })}
        />
      )}

      {state.screen === "confirm" && doc && (
        <Confirm
          doc={doc}
          confidence={state.confidence}
          extracted={state.extracted}
          hasSource={state.source !== null}
          lang={lang}
          hasRuleset={ruleset !== null}
          onChange={(next) => dispatch({ type: "edit", doc: next })}
          onChangeType={() => dispatch({ type: "start-manual" })}
          onSubmit={submit}
        />
      )}

      {state.screen === "result" && verdict && doc && (
        <Result
          verdict={verdict}
          doc={doc}
          explanation={state.explanation}
          explaining={state.explaining}
          explainFailed={state.explainFailed}
          lang={lang}
          interpLang={interpLang}
          onInterpLang={(next) => dispatch({ type: "set-interp-lang", lang: next })}
          source={state.source}
          onComplaint={openComplaint}
          onStartOver={() => dispatch({ type: "reset" })}
        />
      )}

      {state.screen === "complaint" && state.complaint && (
        <ComplaintDraft
          formalEnglish={state.complaint.formalEnglish}
          translated={state.complaint.translated}
          lang={lang}
          onBack={() => dispatch({ type: "go", screen: "result" })}
        />
      )}

      {/* Earned, not asked for up front: the install prompt only appears once
          the app has actually checked or explained something. */}
      <div className="pb-4">
        <InstallPrompt earned={state.verdict !== null} lang={lang} />
      </div>
    </main>
  );
}

/** Drives the offline copy on Capture — the camera is useless without network. */
function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}
