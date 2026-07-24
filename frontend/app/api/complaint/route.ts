import { z } from "zod";
import { polishComplaint } from "@/lib/gemma/complaint";

/**
 * Optional polish only. The complaint is already complete before this route is
 * called; a failure here costs the user a translation, never the complaint.
 */

export const runtime = "nodejs";

const BodySchema = z.object({
  template: z.string().min(1),
  lang: z.enum(["en", "yo", "pcm"]),
});

export async function POST(request: Request) {
  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ ok: false, error: { kind: "bad_request" } }, { status: 400 });
  }

  const result = await polishComplaint(body.data.template, body.data.lang, request.signal);
  if (!result.ok) {
    return Response.json({ ok: false, error: { kind: result.error.kind } }, { status: 502 });
  }

  return Response.json({ ok: true, text: result.value.text });
}
