/* eslint-env serviceworker */
/**
 * Nma's Kitchen service worker.
 *
 * Strategy
 * --------
 * • Navigations: network-first, falling back to the cached app shell and then
 *   to `/offline.html` when the device is offline.
 * • Vite's hashed build output (`/assets/*`): cache-first, those filenames are
 *   content-addressed, so a cached copy is always the right copy.
 * • Same-origin images: stale-while-revalidate.
 * • Anything else (including every API call) is passed straight through and
 *   NEVER cached. Authenticated API responses must not end up in a shared
 *   cache, that is a security requirement, not an optimisation.
 *
 * Bump CACHE_VERSION on release; old caches are purged on activate.
 */

const CACHE_VERSION = "v1";
const SHELL_CACHE = `nmas-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `nmas-assets-${CACHE_VERSION}`;
const IMAGE_CACHE = `nmas-images-${CACHE_VERSION}`;

const SHELL_URLS = ["/", "/offline.html", "/manifest.webmanifest", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  const keep = new Set([SHELL_CACHE, ASSET_CACHE, IMAGE_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // Never cache cross-origin traffic or anything that looks like an API call.
  const isApi =
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("/auth") ||
    request.headers.get("authorization") !== null;
  if (!sameOrigin || isApi) return;

  // App navigations.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put("/", copy)).catch(() => {});
          return response;
        })
        .catch(async () => {
          const cached = await caches.match("/");
          return cached || caches.match("/offline.html");
        }),
    );
    return;
  }

  // Hashed build assets.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
            return response;
          }),
      ),
    );
    return;
  }

  // Food photography and icons, show what we have, refresh in the background.
  if (request.destination === "image") {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(IMAGE_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
            return response;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});
