import { z } from "zod";
import { explainDocument, explainVerdict } from "@/lib/gemma/explain";
import { GenericDocumentSchema, VerdictSchema } from "@/lib/schemas/verdict";
import type { ConfirmedGenericDocument, Verdict } from "@/lib/verify/types";

/**
 * Explanation only. This route never sees an image and never produces a
 * verdict — it receives one already decided, or facts it is forbidden to
 * evaluate (technical.md §6).
 */

export const runtime = "nodejs";

const BodySchema = z.union([
  z.object({ kind: z.literal("verdict"), verdict: VerdictSchema }),
  z.object({
    kind: z.literal("interpretation"),
    doc: GenericDocumentSchema,
    /**
     * The document itself, when there is one. Interpretation is written from
     * the page rather than from extracted fields — there is no verdict here for
     * a typed schema to protect, and summarising to five fields first is what
     * made the old explanations thin.
     */
    source: z
      .object({
        mimeType: z
          .string()
          .refine((type) => type.startsWith("image/") || type === "application/pdf"),
        data: z.string().min(1),
      })
      .optional(),
    /** Which languages to generate now. The client asks for the one on screen
        first, then the rest in the background. */
    langs: z.array(z.enum(["en", "yo", "pcm"])).min(1).default(["en", "yo", "pcm"]),
  }),
]);

export async function POST(request: Request) {
  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ ok: false, error: { kind: "bad_request" } }, { status: 400 });
  }

  const result =
    body.data.kind === "verdict"
      ? await explainVerdict(body.data.verdict as Verdict, request.signal)
      : await explainDocument(
          body.data.doc as ConfirmedGenericDocument,
          body.data.source,
          body.data.langs,
          request.signal,
        );

  if (!result.ok) {
    return Response.json(
      { ok: false, error: { kind: result.error.kind, attempts: result.error.attempts } },
      { status: result.error.kind === "no_api_key" ? 503 : 502 },
    );
  }

  return Response.json({ ok: true, kind: body.data.kind, explanation: result.value });
}
