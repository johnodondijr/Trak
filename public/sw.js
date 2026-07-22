/**
 * Trak service worker — a small stale-while-revalidate cache so the app is
 * installable and works offline. Vite fingerprints asset names, so instead of a
 * fixed precache list we cache GET requests as they're seen and serve the
 * cached copy first (falling back to the network, then to cache when offline).
 */
const CACHE = "trak-cache-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            cache.put(req, res.clone());
          }
          return res;
        })
        .catch(() => cached || cache.match("./index.html"));
      return cached || network;
    })(),
  );
});
