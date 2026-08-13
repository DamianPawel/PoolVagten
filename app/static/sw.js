// Poolvagtens service worker — bevidst UDEN caching.
//
// Formålet er kun at gøre appen installerbar på hjemmeskærmen. Vi cacher
// ingenting: appen henter altid frisk fra serveren, præcis som før. Det er
// et bevidst valg efter episoden hvor en cachet index.html gav en blank side
// — og fordi cachede API-svar ville rode med login og den delte status.

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  // Ryd eventuelle gamle caches, hvis en tidligere version havde nogen.
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch-handler uden respondWith: browseren håndterer alt normalt (network-only).
// Handleren skal findes, for at browseren betragter appen som installerbar.
self.addEventListener("fetch", () => {});
