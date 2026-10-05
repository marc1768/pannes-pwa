// Service worker PWA Pannes
// Met en cache UNIQUEMENT les fichiers de l'interface (même origine).
// Les appels au script Google (script.google.com / googleusercontent.com) ne sont jamais interceptés.
//
// v7 : version de cache relevée (démarrage en parallèle dans index.html).
// v6 : ouverture instantanée. Les fichiers de l'interface sont servis TOUT DE SUITE depuis le cache,
// puis remis à jour en arrière-plan depuis GitHub (la nouvelle version est utilisée à l'ouverture
// suivante). Avant, on attendait le réseau d'abord : sur une connexion lente, la page elle-même
// pouvait mettre de longues secondes à s'afficher.
const VERSION = 'pannes-v7';
const FICHIERS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(FICHIERS.map((f) => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // Ni POST, ni autre domaine : on laisse passer sans rien mettre en cache.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (!req.url.startsWith(self.registration.scope)) return;

  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const enCache = (await cache.match(req, { ignoreSearch: true })) ||
                    (req.mode === 'navigate' ? await cache.match('./index.html') : undefined);
    // Mise à jour en arrière-plan (sans le cache HTTP du navigateur).
    const reseau = fetch(url.href, { cache: 'no-cache', credentials: 'same-origin' }).then((rep) => {
      if (rep.ok) cache.put(req, rep.clone());
      return rep;
    });
    if (enCache) {
      e.waitUntil(reseau.catch(() => {}));
      return enCache;
    }
    // Pas encore en cache (toute première ouverture) : réseau, avec la page en secours.
    return reseau.catch(() => cache.match('./index.html'));
  })());
});
