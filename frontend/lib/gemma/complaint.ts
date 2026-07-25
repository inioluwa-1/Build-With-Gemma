import { z } from "zod";
import { generateValidated, type HarnessResult } from "./harness";
import type { GenerateFn } from "./types";
import { languageName } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n/types";

/**
 * Template-first, model-polished (technical.md §7).
 *
 * The English template is already complete and correct before this runs. The
 * model's only job is to render the same message naturally in the user's
 * language — it is explicitly forbidden from touching a number. If this call
 * fails, the caller ships the template and the feature still works.
 */

const SYSTEM = `You translate a complaint letter about an electricity bill into the reader's own language, keeping it usable as a real complaint.

- Reproduce every number, date and reference exactly as given. Never recalculate, round, or drop one.
- Keep the meaning and the claims identical. Do not add new claims, accusations, or legal language.
- Keep it polite and firm, the way a customer writes to a company.
- Keep the blank lines for account number and name.

Return only this JSON object, no prose and no markdown fences:
{ "text": "..." }`;

const PolishSchema = z.object({ text: z.string().min(1) });

export function polishComplaint(
  template: string,
  lang: Lang,
  generate: GenerateFn,
  signal?: AbortSignal,
): Promise<HarnessResult<z.infer<typeof PolishSchema>>> {
  return generateValidated(
    PolishSchema,
    {
      system: SYSTEM,
      prompt: `Render this complaint in ${languageName(lang)}.\n\n${template}`,
      temperature: 0.3,
      signal,
    },
    generate,
  );
}
