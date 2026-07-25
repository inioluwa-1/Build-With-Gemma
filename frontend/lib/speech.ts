"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

const noop = () => () => {};
const hasSpeech = () => typeof window !== "undefined" && "speechSynthesis" in window;

/**
 * Read-aloud for the interpretation output, on the browser's built-in
 * SpeechSynthesis — no dependency, no network, so it works offline like the
 * rest of the app.
 *
 * Voice coverage is the platform's, not ours: English is universal, French and
 * Arabic common, the Nigerian languages rarely installed. When the requested
 * language has no voice the engine falls back to its default rather than
 * failing, so the button never dead-ends — it just may not sound native.
 */
export function useSpeech() {
  // `false` on the server, the real capability on the client — the supported
  // store pattern, so the control's presence never causes a hydration mismatch.
  const supported = useSyncExternalStore(noop, hasSpeech, () => false);
  const [speaking, setSpeaking] = useState(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!hasSpeech()) return;

    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    load(); // Some engines have voices ready synchronously…
    window.speechSynthesis.addEventListener("voiceschanged", load); // …others fire this.

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.speechSynthesis.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    if (!hasSpeech()) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback((text: string, bcp47: string) => {
    if (!hasSpeech()) return;
    if (!text.trim()) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = bcp47;

    // Exact locale first, then any voice sharing the primary subtag (yo-NG → yo),
    // then leave it to the engine default.
    const primary = bcp47.split("-")[0].toLowerCase();
    const voices = voicesRef.current;
    const voice =
      voices.find((v) => v.lang.toLowerCase() === bcp47.toLowerCase()) ??
      voices.find((v) => v.lang.toLowerCase().startsWith(`${primary}-`)) ??
      voices.find((v) => v.lang.toLowerCase() === primary);
    if (voice) utterance.voice = voice;

    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, []);

  return { supported, speaking, speak, stop };
}
