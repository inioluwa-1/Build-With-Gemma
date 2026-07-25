export const LANGS = ["en", "yo", "pcm"] as const;
export type Lang = (typeof LANGS)[number];

/** The languages surfaced in the toggle, in order. */
export const TOGGLE_LANGS: Lang[] = ["en", "yo", "pcm"];

export type { Catalogue, StringKey } from "./en";
