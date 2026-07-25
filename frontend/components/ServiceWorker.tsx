"use client";

import { useEffect } from "react";

/**
 * Registers the service worker so the app is installable and works offline.
 *
 * It registers in every environment, because "is this installable?" should not
 * depend on how the app was started. The mode is passed through the script URL:
 * in development the worker runs network-only (installable, but it never caches,
 * so it can't serve a stale chunk and fight hot reload); in production it does
 * the full precache-and-serve. See public/sw.js.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const mode = process.env.NODE_ENV === "production" ? "prod" : "dev";
    navigator.serviceWorker.register(`/sw.js?mode=${mode}`).catch(() => {
      // An unregistered worker costs offline support and installability, nothing
      // that breaks the running app.
    });
  }, []);

  return null;
}
