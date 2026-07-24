import { z } from "zod";
import { GenericDocumentTypeSchema } from "./extraction";

/**
 * The verdict crosses the wire to /api/explain, so it is validated on arrival
 * like any other input. The client computed it, but the route does not get to
 * assume that.
 */

const BandSchema = z.enum(["A", "B", "C", "D", "E"]);

const MathLineSchema = z.object({
  key: z.enum([
    "math.energy",
    "math.vat",
    "math.arrears",
    "math.expectedTotal",
    "math.charged",
    "math.comparable",
    "math.difference",
  ]),
  params: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  value: z.number().nullable(),
  kind: z.enum(["input", "computed", "total", "aside", "difference"]),
});

const Checked = {
  math: z.array(MathLineSchema),
  expected: z.number(),
  charged: z.number(),
  band: BandSchema,
  source: z.string(),
  effectiveDate: z.string(),
};

export const VerdictSchema = z.union([
  z.object({ status: z.literal("checks_out"), ...Checked }),
  z.object({ status: z.literal("discrepancy"), ...Checked, difference: z.number() }),
  z.object({
    status: z.literal("cannot_verify"),
    reason: z.enum(["missing_fields", "no_published_rate"]),
    missing: z.array(z.string()),
  }),
  z.object({
    status: z.literal("interpretation_only"),
    documentType: z.string(),
  }),
]);

export const GenericDocumentSchema = z.object({
  documentType: GenericDocumentTypeSchema,
  issuer: z.string().nullable(),
  subject: z.string().nullable(),
  amounts: z.array(z.object({ label: z.string(), value: z.number(), currency: z.string() })),
  dates: z.array(z.object({ label: z.string(), value: z.string() })),
  obligations: z.array(z.string()),
});

export const BillSchema = z.object({
  documentType: z.literal("electricity_bill"),
  band: BandSchema.nullable(),
  unitsKwh: z.number().nullable(),
  amountCharged: z.number().nullable(),
  energyCharge: z.number().nullable(),
  arrears: z.number().nullable(),
  readingType: z.enum(["estimated", "actual"]).nullable(),
});
