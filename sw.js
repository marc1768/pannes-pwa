// Service worker PWA Pannes
// Met en cache UNIQUEMENT les fichiers de l'interface (même origine).
// Les appels au script Google (script.google.com / googleusercontent.com) ne sont jamais interceptés.
const VERSION = 'pannes-v5';
const FICHIERS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
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

  // Réseau d'abord (pour recevoir les mises à jour), cache en secours hors connexion.
  e.respondWith(
    fetch(req)
      .then((rep) => {
        if (rep.ok) {
          const copie = rep.clone();
          caches.open(VERSION).then((c) => c.put(req, copie));
        }
        return rep;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
  );
});
