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

export function outputLangName(lang: OutputLang): string {
  return OUTPUT_LANG_NAMES[lang];
}

export function isOutputLang(value: string): value is OutputLang {
  return (OUTPUT_LANGS as readonly string[]).includes(value);
}
