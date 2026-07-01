/* Service worker minimal — cache l'app shell pour un fonctionnement PWA/offline.
   Les photos cataas.com restent chargées depuis le réseau (avec fallback SVG). */
const CACHE = "meowmatch-v2";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./js/app.js",
  "./js/rng.js",
  "./js/store.js",
  "./js/data/pools.js",
  "./js/data/seed.js",
  "./js/data/cataas-ids.js",
  "./js/engine/chat-engine.js",
  "./js/engine/dialogue-engine.js",
  "./js/engine/persona.js",
  "./js/engine/llm-adapter.js",
  "./assets/icon.svg"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Réseau d'abord pour les images distantes ; cache-first pour l'app shell.
  if(url.origin === location.origin){
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
      return res;
    }).catch(() => caches.match("./index.html"))));
  }
});
