/**
 * Draft the Yorùbá and Pidgin UI catalogues with Gemma.
 *
 *   npm run translate            # every key still awaiting review
 *   npm run translate -- --lang yo --force
 *
 * Output is a *draft*. Every generated key is recorded as unreviewed in
 * review-status.json; a key marked reviewed is never overwritten, so a native
 * speaker's corrections survive re-runs. Missing or blank keys fall back to
 * English at runtime, so shipping a partial catalogue is safe.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { en, type StringKey } from "../lib/i18n/en.ts";
import { pcm } from "../lib/i18n/pcm.ts";
import { yo } from "../lib/i18n/yo.ts";

// Deliberately self-contained: this runs under Node's type stripping, which
// needs an explicit .ts on every relative import — a rule the app's own module
// graph does not follow. Standalone tooling should not be wired into app
// internals anyway.

const HERE = dirname(fileURLToPath(import.meta.url));
const I18N_DIR = join(HERE, "..", "lib", "i18n");
const REVIEW_PATH = join(I18N_DIR, "review-status.json");
const BATCH_SIZE = 25;

type Target = "yo" | "pcm";

const REGISTER: Record<Target, string> = {
  yo: `Yorùbá as actually spoken in everyday conversation — the way a sharp, honest friend explains something, not formal broadcast or textbook translation. Use correct diacritics throughout (ẹ, ọ, ṣ, and tone marks). Keep it short; these are interface labels and one-line messages, not prose.`,
  pcm: `Nigerian Pidgin as actually spoken — natural, warm, direct. Not phonetically-spelled English, and not exaggerated. Keep it short; these are interface labels and one-line messages.`,
};

const SYSTEM = `You translate user-interface strings for Vernac, an app that explains official documents — electricity bills, government letters, tenancy notices — to Nigerians in their own language.

Rules, all of them absolute:
- Preserve every {placeholder} exactly as written. Never translate, reorder inside, or drop one.
- Preserve the meaning precisely. These strings state what the app did and did not check; softening or embellishing them makes the app dishonest.
- Keep ₦, %, ✓ and digits as they are.
- Match the source register: plain, second person, sentence case. Never apologise where the English does not.
- Return ONLY a JSON object mapping each key to its translation. No prose, no markdown fences.`;

type ReviewStatus = Record<Target, Partial<Record<StringKey, boolean>>>;

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

/** Ask once, strip fences, parse. A failed batch is skipped, not fatal. */
async function askForJson(prompt: string): Promise<Record<string, string> | null> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: process.env.GEMMA_MODEL || "gemma-4-31b-it",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: SYSTEM,
          temperature: 0.3,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        },
      });
      const raw = (response.candidates?.[0]?.content?.parts ?? [])
        .filter((part) => !part.thought && typeof part.text === "string")
        .map((part) => part.text)
        .join("") || response.text || "";
      const body = raw.replace(/```json|```/g, "").trim();
      const start = body.indexOf("{");
      const end = body.lastIndexOf("}");
      const parsed: unknown = JSON.parse(start === -1 ? body : body.slice(start, end + 1));
      if (parsed && typeof parsed === "object") return parsed as Record<string, string>;
    } catch (error) {
      if (attempt === 3) console.error(`  ✗ ${(error as Error).message.slice(0, 120)}`);
    }
  }
  return null;
}

function loadReviewStatus(): ReviewStatus {
  try {
    return JSON.parse(readFileSync(REVIEW_PATH, "utf8")) as ReviewStatus;
  } catch {
    return { yo: {}, pcm: {} };
  }
}

function keysToTranslate(
  existing: Partial<Record<StringKey, string>>,
  reviewed: Partial<Record<StringKey, boolean>>,
  force: boolean,
): StringKey[] {
  return (Object.keys(en) as StringKey[]).filter((key) => {
    if (reviewed[key]) return false; // never clobber a human's work
    return force || !existing[key];
  });
}

async function translateBatch(target: Target, keys: StringKey[]): Promise<Record<string, string>> {
  const source = Object.fromEntries(keys.map((key) => [key, en[key]]));
  const result = await askForJson(`Translate these interface strings into ${REGISTER[target]}

Source (JSON, key to English string):
${JSON.stringify(source, null, 2)}

Return a JSON object with exactly these ${keys.length} keys.`);
  return result ?? {};
}

function writeCatalogue(target: Target, entries: Partial<Record<StringKey, string>>): void {
  const header =
    target === "yo"
      ? `import type { Catalogue } from "./en";

/**
 * Yorùbá catalogue — drafted by \`npm run translate\`, awaiting a native-speaker
 * pass. See review-status.json for which keys are still unreviewed. Missing or
 * blank keys fall back to English at runtime.
 *
 * Register: natural, conversational, everyday Yorùbá. Diacritics (ẹ ọ ṣ and
 * tone marks) must survive; check them on a real Android before demo.
 */
export const yo: Partial<Catalogue> = {`
      : `import type { Catalogue } from "./en";

/**
 * Nigerian Pidgin catalogue — drafted by \`npm run translate\`, awaiting a
 * native-speaker pass. Shipped from day one, undemoed by default. Missing or
 * blank keys fall back to English at runtime.
 */
export const pcm: Partial<Catalogue> = {`;

  const body = (Object.keys(en) as StringKey[])
    .filter((key) => entries[key])
    .map((key) => `  ${JSON.stringify(key)}: ${JSON.stringify(entries[key])},`)
    .join("\n");

  writeFileSync(join(I18N_DIR, `${target}.ts`), `${header}\n${body}\n};\n`, "utf8");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const only = args.includes("--lang") ? (args[args.indexOf("--lang") + 1] as Target) : null;
  const targets: Target[] = only ? [only] : ["yo", "pcm"];

  if (!process.env.GOOGLE_API_KEY) {
    console.error(
      "GOOGLE_API_KEY is not set. Run with:\n  node --env-file=.env.local scripts/generate-translations.ts",
    );
    process.exit(1);
  }

  const review = loadReviewStatus();
  const existing: Record<Target, Partial<Record<StringKey, string>>> = { yo: { ...yo }, pcm: { ...pcm } };

  for (const target of targets) {
    const pending = keysToTranslate(existing[target], review[target] ?? {}, force);
    if (pending.length === 0) {
      console.log(`${target}: nothing to translate.`);
      continue;
    }
    console.log(`${target}: translating ${pending.length} keys…`);

    const merged = { ...existing[target] };
    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const batch = pending.slice(i, i + BATCH_SIZE);
      const translated = await translateBatch(target, batch);
      let kept = 0;
      for (const key of batch) {
        const value = translated[key];
        // A translation that lost a {placeholder} would render a broken string
        // to a user who cannot read the English original. Drop it instead.
        if (!value || !placeholdersMatch(en[key], value)) continue;
        merged[key] = value;
        review[target] = { ...review[target], [key]: false };
        kept++;
      }
      console.log(`  batch ${i / BATCH_SIZE + 1}: kept ${kept}/${batch.length}`);
    }

    writeCatalogue(target, merged);
    console.log(`${target}: wrote lib/i18n/${target}.ts`);
  }

  writeFileSync(REVIEW_PATH, `${JSON.stringify(review, null, 2)}\n`, "utf8");
  const unreviewed = targets.reduce(
    (n, target) => n + Object.values(review[target] ?? {}).filter((r) => !r).length,
    0,
  );
  console.log(`\n${unreviewed} strings await native-speaker review (lib/i18n/review-status.json).`);
}

function placeholdersMatch(source: string, translated: string): boolean {
  const of = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
  return of(source) === of(translated);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
