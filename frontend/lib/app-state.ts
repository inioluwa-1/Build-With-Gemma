import type { StringKey } from "./i18n/en";
import type { Lang } from "./i18n/types";
import type { OutputLang } from "./i18n/output-langs";
import type { ClassifiedExtraction } from "./schemas/extraction";
import type { Explanation, InterpretationSections } from "./schemas/explain";
import type { EncodedDocument } from "./upload";
import type { ConfirmedDocument, DocumentType, Verdict } from "./verify/types";

/**
 * One state machine for the whole app.
 *
 * There are no routes and no persistence — no accounts, no history (PRD §4) —
 * so the confirmed document simply lives here across Capture → Confirm →
 * Result. Every transition is instant offline, which is the point.
 */

export type Screen =
  | "capture"
  | "type-picker"
  | "reading"
  | "confirm"
  | "result"
  | "complaint";

export interface AppState {
  screen: Screen;
  lang: Lang;
  /**
   * The language the interpretation report is rendered in — chosen on the
   * result screen, independent of `lang` (the app UI). Defaults to the app
   * language when a document is interpreted, then follows the report's own
   * dropdown, which can reach any language in OUTPUT_LANGS.
   */
  interpLang: OutputLang;
  doc: ConfirmedDocument | null;
  /** Per-field 0–1 from extraction. Empty for manual entry, where the user is the source. */
  confidence: Record<string, number>;
  /**
   * Whether a model actually read this document. On the manual path nothing was
   * read, so the "I couldn't read your X" copy would be a lie — fields render
   * plain and empty instead.
   */
  extracted: boolean;
  /**
   * The uploaded file itself, kept so interpretation can be written from the
   * document rather than from a handful of extracted fields. Verification never
   * uses it — a verdict is computed from confirmed numbers alone.
   */
  source: EncodedDocument | null;
  verdict: Verdict | null;
  explanation: Explanation | null;
  explaining: boolean;
  explainFailed: boolean;
  /** A degradation message, shown without apology. */
  notice: StringKey | null;
  complaint: { formalEnglish: string; translated: string | null } | null;
}

export const initialState: AppState = {
  screen: "capture",
  lang: "en",
  interpLang: "en",
  doc: null,
  confidence: {},
  extracted: false,
  source: null,
  verdict: null,
  explanation: null,
  explaining: false,
  explainFailed: false,
  notice: null,
  complaint: null,
};

export type Action =
  | { type: "set-lang"; lang: Lang }
  | { type: "start-manual" }
  | { type: "start-reading" }
  | { type: "extracted"; extraction: ClassifiedExtraction; source: EncodedDocument }
  | { type: "extract-failed"; notice: StringKey }
  | { type: "pick-type"; documentType: DocumentType }
  | { type: "edit"; doc: ConfirmedDocument }
  | { type: "verdict"; verdict: Verdict }
  | { type: "explaining" }
  | { type: "explained"; explanation: Explanation }
  | { type: "explained-more"; sections: Partial<Record<OutputLang, InterpretationSections>> }
  | { type: "set-interp-lang"; lang: OutputLang }
  | { type: "explain-failed" }
  | { type: "complaint"; formalEnglish: string; translated: string | null }
  | { type: "go"; screen: Screen }
  | { type: "reset" };

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "set-lang":
      return { ...state, lang: action.lang };

    case "start-manual":
      return { ...state, screen: "type-picker", notice: null };

    case "start-reading":
      return { ...state, screen: "reading", notice: null };

    case "extracted":
      return {
        ...state,
        screen: "confirm",
        doc: toConfirmedDocument(action.extraction),
        confidence: action.extraction.fields.confidence,
        extracted: true,
        source: action.source,
      };

    // Extraction failure is a routing decision, not a dead end: the user lands
    // on manual entry, where verification still works in full.
    case "extract-failed":
      return { ...state, screen: "type-picker", notice: action.notice };

    case "pick-type":
      return {
        ...state,
        screen: "confirm",
        doc: emptyDocument(action.documentType),
        confidence: {},
        extracted: false,
        source: null,
      };

    case "edit":
      return { ...state, doc: action.doc };

    case "verdict":
      return {
        ...state,
        screen: "result",
        verdict: action.verdict,
        explanation: null,
        explainFailed: false,
        // A fresh document starts its report in the app language; the reader can
        // then switch it independently on the result screen.
        interpLang: state.lang,
      };

    case "set-interp-lang":
      return { ...state, interpLang: action.lang };

    case "explaining":
      return { ...state, explaining: true, explainFailed: false };

    case "explained":
      return { ...state, explaining: false, explanation: action.explanation };

    // The background languages arriving after the first render. Merged rather
    // than replaced, so the section already on screen never flickers.
    case "explained-more":
      if (state.explanation?.kind !== "interpretation") return state;
      return {
        ...state,
        explanation: {
          kind: "interpretation",
          sections: { ...state.explanation.sections, ...action.sections },
        },
      };

    case "explain-failed":
      return { ...state, explaining: false, explainFailed: true };

    case "complaint":
      return {
        ...state,
        screen: "complaint",
        complaint: { formalEnglish: action.formalEnglish, translated: action.translated },
      };

    case "go":
      return { ...state, screen: action.screen };

    // Language survives a reset — it is the user's, not the document's.
    case "reset":
      return { ...initialState, lang: state.lang };
  }
}

export function emptyDocument(documentType: DocumentType): ConfirmedDocument {
  if (documentType === "electricity_bill") {
    return {
      documentType,
      band: null,
      unitsKwh: null,
      amountCharged: null,
      energyCharge: null,
      arrears: null,
      readingType: null,
    };
  }
  return { documentType, issuer: null, subject: null, amounts: [], dates: [], obligations: [] };
}

/**
 * Extraction output → the shape the user edits and verification consumes.
 *
 * Confidence is deliberately left behind: it belongs to the Confirm screen,
 * which uses it to decide what to ask about. Once the user has confirmed a
 * field, how sure the model was stops mattering.
 */
export function toConfirmedDocument(extraction: ClassifiedExtraction): ConfirmedDocument {
  const fields = extraction.fields;
  if (extraction.documentType === "electricity_bill" && "band" in fields) {
    return {
      documentType: "electricity_bill",
      band: fields.band,
      unitsKwh: fields.unitsKwh,
      amountCharged: fields.amountCharged,
      energyCharge: fields.energyCharge,
      arrears: fields.arrears,
      readingType: fields.readingType,
    };
  }
  if (extraction.documentType === "electricity_bill" || !("issuer" in fields)) {
    return emptyDocument(extraction.documentType);
  }
  return {
    documentType: extraction.documentType,
    issuer: fields.issuer,
    subject: fields.subject,
    amounts: fields.amounts,
    dates: fields.dates,
    obligations: fields.obligations,
  };
}
