"use client";

import { useEffect, useState } from "react";
import { t, type Lang } from "@/lib/i18n";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * The add-to-home-screen ask, shown only after the app has done something
 * useful (design.md §4). `earned` goes true on the first result — asking before
 * that is asking for a favour before giving one.
 */
export function InstallPrompt({ earned, lang }: { earned: boolean; lang: Lang }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const capture = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);

  if (!deferred || !earned || dismissed) return null;

  return (
    <div className="border-ink/20 bg-paper flex items-center gap-3 rounded-xl border p-3">
      <p className="text-small flex-1">{t("install.title", lang)}</p>
      <button
        type="button"
        onClick={async () => {
          await deferred.prompt();
          await deferred.userChoice;
          setDeferred(null);
        }}
        className="bg-band-yellow text-small min-h-12 rounded-lg px-4 font-medium"
      >
        {t("install.accept", lang)}
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-small text-ink/60 min-h-12 px-2"
      >
        {t("install.dismiss", lang)}
      </button>
    </div>
  );
}
