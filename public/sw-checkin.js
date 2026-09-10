// Service Worker — Ingressa Check-in
// Escopo: /painel/eventos/ (registrado com { scope: "/painel/eventos/" })
// Estratégia: network-first com fallback para cache (cache-as-you-go).
// Não intercepta rotas /api/ — o cliente lida com o offline via IndexedDB.
const CACHE = "ingressa-checkin-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Ignora: métodos não-GET, rotas de API, origens externas (fontes, etc.)
  if (e.request.method !== "GET") return;
  if (url.pathname.startsWith("/api/")) return;
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
