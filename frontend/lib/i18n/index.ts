import { en, type Catalogue, type StringKey } from "./en";
import { pcm } from "./pcm";
import { yo } from "./yo";
import { LANGS, type Lang } from "./types";

const CATALOGUES: Record<Lang, Partial<Catalogue>> = { en, yo, pcm };

const LANG_NAMES: Record<Lang, string> = {
  en: "English",
  yo: "Yorùbá",
  pcm: "Pidgin",
};

/**
 * Look up a string, interpolating `{placeholders}`.
 *
 * Falls back to English for any key a translation is missing or has left
 * blank — a half-translated catalogue degrades to English, never to a blank
 * screen or a raw key.
 */
export function t(
  key: StringKey,
  lang: Lang = "en",
  params?: Record<string, string | number>,
): string {
  const template = CATALOGUES[lang]?.[key] || en[key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** A `t` bound to one language, for components that render in a single locale. */
export function translator(lang: Lang) {
  return (key: StringKey, params?: Record<string, string | number>) => t(key, lang, params);
}

export function languageName(lang: Lang): string {
  return LANG_NAMES[lang];
}

export function isLang(value: string): value is Lang {
  return (LANGS as readonly string[]).includes(value);
}

/**
 * The mid-sentence name for a field ("units"), as opposed to its form label
 * ("Units (kWh)"). Used by the ask-don't-guess copy on both screens.
 */
export function fieldInline(field: string, lang: Lang): string {
  return t(`fieldInline.${field}` as StringKey, lang);
}

export { en, LANGS };
export type { Catalogue, Lang, StringKey };
