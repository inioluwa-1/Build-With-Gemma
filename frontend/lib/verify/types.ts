/**
 * Core types for the verification layer.
 *
 * Architecture principle (technical.md): the model reads; the code decides.
 * Nothing in this file depends on Gemma, React or the network. Verification is
 * a pure function over confirmed fields and a static, date-stamped ruleset.
 */

export type DocumentType =
  | "electricity_bill"
  | "tenancy_document"
  | "government_notice"
  | "loan_or_financial"
  | "wage_statement"
  | "legal_document"
  | "other";

export type Band = "A" | "B" | "C" | "D" | "E";

export type ReadingType = "estimated" | "actual";

/**
 * A single row of the shown-work math on the Result screen.
 *
 * Carries an i18n key plus params rather than a rendered string: verification
 * must stay language-agnostic so the same Verdict renders in EN, YO and PCM
 * without recomputation.
 */
export interface MathLine {
  key: MathLineKey;
  params?: Record<string, string | number>;
  value: number | null;
  /**
   * `aside` renders visually detached and is never counted as an error —
   * arrears are the reason this kind exists (PRD F6).
   */
  kind: "input" | "computed" | "total" | "aside" | "difference";
}

export type MathLineKey =
  | "math.energy"
  | "math.vat"
  | "math.arrears"
  | "math.expectedTotal"
  | "math.charged"
  | "math.comparable"
  | "math.difference";

/** Why a document could not be checked, when it could not be checked. */
export type CannotVerifyReason = "missing_fields" | "no_published_rate";

export type Verdict =
  | {
      status: "checks_out";
      math: MathLine[];
      expected: number;
      charged: number;
      band: Band;
      source: string;
      effectiveDate: string;
    }
  | {
      status: "discrepancy";
      math: MathLine[];
      expected: number;
      charged: number;
      difference: number;
      band: Band;
      source: string;
      effectiveDate: string;
    }
  | {
      status: "cannot_verify";
      reason: CannotVerifyReason;
      /** Field names the user must supply, in the ask-don't-guess copy. */
      missing: string[];
    }
  /**
   * A first-class verdict state, not an error (technical.md §5). It routes to
   * the interpretation renderer and can never carry a stamp: the tier boundary
   * is enforced by this union, not only by copy.
   */
  | {
      status: "interpretation_only";
      documentType: DocumentType;
    };

/** Fields the user has seen and corrected on the Confirm screen. */
export interface ConfirmedBill {
  documentType: "electricity_bill";
  band: Band | null;
  unitsKwh: number | null;
  /** Total payable, ₦. */
  amountCharged: number | null;
  /** Pre-VAT energy line, if printed on the bill. Informational only. */
  energyCharge: number | null;
  /** Separate line item. Never treated as an error. */
  arrears: number | null;
  readingType: ReadingType | null;
}

export interface DocumentAmount {
  label: string;
  value: number;
  currency: string;
}

export interface DocumentDate {
  label: string;
  value: string;
}

export interface ConfirmedGenericDocument {
  documentType: Exclude<DocumentType, "electricity_bill">;
  issuer: string | null;
  subject: string | null;
  amounts: DocumentAmount[];
  dates: DocumentDate[];
  obligations: string[];
}

export type ConfirmedDocument = ConfirmedBill | ConfirmedGenericDocument;

export interface BandRule {
  /**
   * Carried solely to render the band-eligibility complaint-ground note
   * (PRD §6). Never an input to any verdict: supply hours cannot be verified
   * from the document, so they are surfaced, never asserted.
   */
  minSupplyHours: number;
  ratePerKwh: number;
}

export interface NercTable {
  source: string;
  disco: string;
  effectiveDate: string;
  vatRate: number;
  /**
   * Whether the published band rates already contain VAT. See README —
   * this flag is the single highest-risk constant in the app and is
   * calibrated against a real, known-correct bill.
   */
  ratesIncludeVat: boolean;
  tolerance: { minNaira: number; percentOfExpected: number };
  bands: Record<Band, BandRule>;
}

/** A ruleset pairs a static reference table with a pure verification function. */
export interface Ruleset {
  id: string;
  documentType: DocumentType;
  schema: string;
  source: string;
  effectiveDate: string;
  verify: (doc: ConfirmedDocument) => Verdict;
}
