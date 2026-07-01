/* Service worker minimal — cache l'app shell pour un fonctionnement PWA/offline.
   Les photos cataas.com restent chargées depuis le réseau (avec fallback SVG). */
const CACHE = "meowmatch-v13";
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
  "./js/data/generated-photos.js",
  "./js/engine/chat-engine.js",
  "./js/engine/dialogue-engine.js",
  "./js/engine/persona.js",
  "./js/engine/matchmaking.js",
  "./js/engine/llm-adapter.js",
  "./assets/icon.svg"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Les données de seed (manifeste photos, seed, pools…) changent à chaque
// régénération : on veut TOUJOURS la dernière version quand on est en ligne.
function isFreshData(url){
  return url.pathname.includes("/js/data/") && url.pathname.endsWith(".js");
}

function putInCache(request, res){
  const copy = res.clone();
  caches.open(CACHE).then(c => c.put(request, copy)).catch(()=>{});
  return res;
}

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Images distantes (cataas…) : on laisse le réseau gérer.
  if(url.origin !== location.origin) return;

  // js/data/*.js : network-first -> les nouveaux chats/photos apparaissent sans
  // avoir à bumper la version du cache. Secours sur le cache si hors-ligne.
  if(isFreshData(url)){
    e.respondWith(
      fetch(e.request)
        .then(res => putInCache(e.request, res))
        .catch(() => caches.match(e.request).then(hit => hit || caches.match("./index.html")))
    );
    return;
  }

  // Reste de l'app shell : cache-first (rapide, offline).
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)
    .then(res => putInCache(e.request, res))
    .catch(() => caches.match("./index.html"))));
});
