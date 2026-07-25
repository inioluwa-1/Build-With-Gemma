"use client";

import { useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import { listOllamaModels } from "@/lib/gemma/ollama";
import type { ProviderConfig, ProviderMode } from "@/lib/provider";

/**
 * Where Gemma runs (cloud vs the user's own Ollama).
 *
 * Cloud is the default and needs no configuration. Local is opt-in: the user
 * points the app at their Ollama and picks a pulled model. Because the browser
 * calls Ollama directly, the two things that actually trip people up — a
 * blocked origin and http-on-https — are stated inline rather than left to fail
 * silently.
 */
export function Settings({
  lang,
  config,
  onChange,
  onClose,
}: {
  lang: Lang;
  config: ProviderConfig;
  onChange: (patch: Partial<ProviderConfig>) => void;
  onClose: () => void;
}) {
  type TestState =
    | { status: "idle" }
    | { status: "testing" }
    | { status: "connected" }
    | { status: "model-missing" }
    | { status: "unreachable" };
  const [test, setTest] = useState<TestState>({ status: "idle" });

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const runTest = async () => {
    setTest({ status: "testing" });
    try {
      const models = await listOllamaModels(config.host);
      const has = models.some((m) => m === config.model || m.startsWith(`${config.model}:`));
      setTest({ status: has ? "connected" : "model-missing" });
    } catch {
      setTest({ status: "unreachable" });
    }
  };

  const setMode = (mode: ProviderMode) => {
    onChange({ mode });
    setTest({ status: "idle" });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("settings.title", lang)}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="bg-paper flex w-full max-w-md flex-col gap-5 rounded-2xl p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-title">{t("settings.title", lang)}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("settings.close", lang)}
            className="text-ink/60 min-h-12 min-w-12 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <ModeCard
            active={config.mode === "cloud"}
            label={t("settings.modeCloud", lang)}
            body={t("settings.cloudBody", lang)}
            onSelect={() => setMode("cloud")}
          />
          <ModeCard
            active={config.mode === "local"}
            label={t("settings.modeLocal", lang)}
            body={t("settings.localBody", lang)}
            onSelect={() => setMode("local")}
          />
        </div>

        {config.mode === "local" && (
          <div className="flex flex-col gap-3">
            <Field
              label={t("settings.host", lang)}
              value={config.host}
              placeholder="http://localhost:11434"
              onChange={(host) => {
                onChange({ host });
                setTest({ status: "idle" });
              }}
            />
            <Field
              label={t("settings.model", lang)}
              value={config.model}
              placeholder="gemma4:e4b"
              onChange={(model) => {
                onChange({ model });
                setTest({ status: "idle" });
              }}
            />

            <button
              type="button"
              onClick={runTest}
              disabled={test.status === "testing"}
              className="border-ink text-body min-h-12 rounded-xl border-2 py-2 font-medium disabled:opacity-60"
            >
              {test.status === "testing" ? t("settings.testing", lang) : t("settings.test", lang)}
            </button>

            {test.status === "connected" && (
              <p className="text-small text-verify-green">
                {t("settings.connected", lang, { model: config.model })}
              </p>
            )}
            {test.status === "model-missing" && (
              <p className="text-caution-amber text-small font-mono">
                {t("settings.modelMissing", lang, { model: config.model })}
              </p>
            )}
            {test.status === "unreachable" && (
              <p className="text-alert-red text-small">{t("settings.unreachable", lang)}</p>
            )}

            <p className="text-small text-ink/60 font-mono break-words">
              {t("settings.corsHint", lang, { origin })}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="bg-ink text-paper text-body min-h-12 rounded-xl py-3 font-medium"
        >
          {t("settings.done", lang)}
        </button>
      </div>
    </div>
  );
}

function ModeCard({
  active,
  label,
  body,
  onSelect,
}: {
  active: boolean;
  label: string;
  body: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`flex flex-col gap-1 rounded-xl border-2 p-4 text-left ${
        active ? "border-ink bg-ink/[0.03]" : "border-ink/20"
      }`}
    >
      <span className="text-body flex items-center gap-2 font-medium">
        <span aria-hidden>{active ? "●" : "○"}</span>
        {label}
      </span>
      <span className="text-small text-ink/70">{body}</span>
    </button>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-small text-ink/70">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
        onChange={(event) => onChange(event.target.value)}
        className="border-ink/30 text-body bg-paper min-h-12 rounded-md border px-3 font-mono"
      />
    </label>
  );
}
