/* SABOSSE — service worker
   Même principe que RHABDO : on sert le cache d'abord pour que
   l'application s'ouvre hors connexion, et on rafraîchit en
   arrière-plan. Changer CACHE force la mise à jour. */
const CACHE = 'sabosse-v1';
const FICHIERS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(cles => Promise.all(cles.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cache => {
      const reseau = fetch(e.request).then(rep => {
        if (rep && rep.status === 200 && rep.type === 'basic') {
          const copie = rep.clone();
          caches.open(CACHE).then(c => c.put(e.request, copie));
        }
        return rep;
      }).catch(() => cache);
      return cache || reseau;
    })
  );
});
