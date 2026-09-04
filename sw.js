/* SABOSSE — service worker
   Même principe que RHABDO : on sert le cache d'abord pour que
   l'application s'ouvre hors connexion, et on rafraîchit en
   arrière-plan. Changer CACHE force la mise à jour. */
const CACHE = 'sabosse-v11';
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

/* Un tap sur la notification ramène à l'app plutôt que de l'ouvrir
   en double si elle est déjà présente dans un onglet/fenêtre. */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(liste => {
      for (const c of liste) { if ('focus' in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});
