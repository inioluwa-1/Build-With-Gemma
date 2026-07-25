"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Where the model runs: the cloud API (Gemma 4 31B behind our routes) or the
 * user's own Ollama (the Gemma 4 they pulled, e.g. gemma4:e4b) reached straight
 * from the browser. The choice and the Ollama coordinates persist in
 * localStorage; the app ships in "cloud" so nothing changes until a user opts in.
 *
 * Backed by an external store (localStorage) rather than component state, so a
 * change is picked up wherever the config is read — and across tabs — without a
 * setState-in-effect.
 */

export type ProviderMode = "cloud" | "local";

export interface ProviderConfig {
  mode: ProviderMode;
  /** Ollama base URL. */
  host: string;
  /** Ollama model tag. */
  model: string;
}

export const DEFAULT_PROVIDER: ProviderConfig = {
  mode: "cloud",
  host: "http://localhost:11434",
  model: "gemma4:e4b",
};

const STORAGE_KEY = "vernac.provider";
const listeners = new Set<() => void>();

// getSnapshot must return a stable reference while the stored value is
// unchanged, or useSyncExternalStore re-renders forever. Cache by serialized key.
let cache: ProviderConfig = DEFAULT_PROVIDER;
let cacheKey = "";

function read(): ProviderConfig {
  if (typeof window === "undefined") return DEFAULT_PROVIDER;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROVIDER;
    const parsed = JSON.parse(raw) as Partial<ProviderConfig>;
    return {
      mode: parsed.mode === "local" ? "local" : "cloud",
      host: typeof parsed.host === "string" && parsed.host ? parsed.host : DEFAULT_PROVIDER.host,
      model: typeof parsed.model === "string" && parsed.model ? parsed.model : DEFAULT_PROVIDER.model,
    };
  } catch {
    return DEFAULT_PROVIDER;
  }
}

function getSnapshot(): ProviderConfig {
  const next = read();
  const key = JSON.stringify(next);
  if (key !== cacheKey) {
    cacheKey = key;
    cache = next;
  }
  return cache;
}

function getServerSnapshot(): ProviderConfig {
  return DEFAULT_PROVIDER;
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  // Other tabs writing the same key.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

function save(patch: Partial<ProviderConfig>): void {
  const next = { ...read(), ...patch };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private-mode / disabled storage: the choice just won't survive a reload.
  }
  listeners.forEach((listener) => listener());
}

export function useProvider() {
  const config = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const update = useCallback((patch: Partial<ProviderConfig>) => save(patch), []);
  return { config, update };
}
