/**
 * Vernac service worker — hand-written, no library.
 *
 * The offline contract (technical.md §8): the shell opens, manual entry works,
 * and verification works *in full*, because the ruleset tables are bundled into
 * the app rather than fetched. Extraction and interpretation need the network
 * and say so. Offline verification is a direct consequence of the static-
 * ruleset architecture, not a feature bolted on.
 *
 * Bump CACHE_VERSION to retire old caches on deploy.
 */

const CACHE_VERSION = "vernac-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

/**
 * The registration URL carries the mode (see components/ServiceWorker.tsx). In
 * development the worker still installs — so the app is installable and the SW
 * lifecycle can be tested — but it never caches, because a cache-first response
 * for a Turbopack chunk would serve stale code and break hot reload.
 */
const DEV = new URL(self.location.href).searchParams.get("mode") === "dev";

self.addEventListener("install", (event) => {
  if (DEV) {
    event.waitUntil(self.skipWaiting());
    return;
  }
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      // A missing shell entry must not abort the whole install.
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Model responses are never cached — a stale verdict explanation is worse
  // than none, and the routes are useless offline anyway.
  if (url.pathname.startsWith("/api/")) return;

  // A fetch handler is required for installability, but in development it must
  // do nothing beyond that: let every request hit the network untouched.
  if (DEV) return;

  // Navigations: fresh when possible, the cached shell when not.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match("/").then((cached) => cached ?? Response.error())),
    );
    return;
  }

  // Everything else — hashed JS/CSS, fonts, icons — is immutable, so cache
  // first and fill the cache as the user goes.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
