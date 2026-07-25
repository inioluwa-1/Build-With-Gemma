import { z } from "zod";
import { extractFromImage } from "@/lib/gemma/extract";

/**
 * The thin proxy that keeps the API key server-side (technical.md §1).
 *
 * It classifies and extracts, and does nothing else — no ruleset resolution,
 * no verification, no verdict. Those happen client-side against static tables,
 * which is what lets verification keep working when this route cannot be
 * reached at all.
 */

export const runtime = "nodejs";

const BodySchema = z.object({
  image: z.object({
    // Photos arrive downscaled; PDFs pass through whole, since the API reads
    // them as documents directly.
    mimeType: z
      .string()
      .refine((type) => type.startsWith("image/") || type === "application/pdf", {
        message: "Unsupported file type",
      }),
    data: z.string().min(1),
  }),
});

export async function POST(request: Request) {
  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ ok: false, error: { kind: "bad_request" } }, { status: 400 });
  }

  const result = await extractFromImage(body.data.image, request.signal);

  if (!result.ok) {
    // A typed failure, never a crash: the client routes to manual entry with
    // the graceful-failure copy and the app stays usable.
    return Response.json(
      { ok: false, error: { kind: result.error.kind, attempts: result.error.attempts } },
      { status: result.error.kind === "no_api_key" ? 503 : 502 },
    );
  }

  return Response.json({ ok: true, extraction: result.value });
}
