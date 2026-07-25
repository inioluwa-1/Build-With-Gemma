/**
 * Languages offered for the *complaint output* only — deliberately separate
 * from the app UI languages in ./types.
 *
 * The two are decoupled because their costs are different. A UI language needs
 * a hand-written catalogue (en/yo/pcm). The complaint output needs none: the
 * English template is already complete and correct (lib/complaint.ts), and the
 * model re-renders it at runtime given nothing but the language's name
 * (lib/gemma/complaint.ts). So the output list can be far longer than the UI
 * list — anything the model renders well.
 *
 * These names are fed verbatim into the model prompt, so they must be names the
 * model recognises (plain English name or common endonym). Nigerian languages
 * lead, then the regional linguae francae a reader might prefer.
 */
export const OUTPUT_LANGS = [
  "en",
  "pcm",
  "yo",
  "ha",
  "ig",
  "ff",
  "fr",
  "ar",
  "pt",
  "sw",
] as const;

export type OutputLang = (typeof OUTPUT_LANGS)[number];

/** Shown in the dropdown and sent to the model as the target language name. */
export const OUTPUT_LANG_NAMES: Record<OutputLang, string> = {
  en: "English",
  pcm: "Nigerian Pidgin",
  yo: "Yorùbá",
  ha: "Hausa",
  ig: "Igbo",
  ff: "Fulfulde",
  fr: "French",
  ar: "Arabic",
  pt: "Portuguese",
  sw: "Swahili",
};

/**
 * BCP-47 tag used to pick a speech-synthesis voice for read-aloud. Nigerian
 * Pidgin has no synthesis voice anywhere, but it is English-based, so an English
 * voice reads it intelligibly — hence "en". Availability of the rest is
 * device-dependent; the reader falls back to the platform default voice when the
 * language has none installed (lib/speech.ts).
 */
export const OUTPUT_LANG_BCP47: Record<OutputLang, string> = {
  en: "en-US",
  pcm: "en-NG",
  yo: "yo-NG",
  ha: "ha-NG",
  ig: "ig-NG",
  ff: "ff",
  fr: "fr-FR",
  ar: "ar",
  pt: "pt-PT",
  sw: "sw",
};

/** Languages written right-to-left — drives `dir` in the print view. */
export const RTL_OUTPUT_LANGS: readonly OutputLang[] = ["ar"];

export function outputLangName(lang: OutputLang): string {
  return OUTPUT_LANG_NAMES[lang];
}

export function isRtlOutputLang(lang: OutputLang): boolean {
  return RTL_OUTPUT_LANGS.includes(lang);
}

export function isOutputLang(value: string): value is OutputLang {
  return (OUTPUT_LANGS as readonly string[]).includes(value);
}
