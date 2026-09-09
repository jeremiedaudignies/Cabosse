/* Cabosse — service worker
   Même principe que RHABDO : on sert le cache d'abord pour que
   l'application s'ouvre hors connexion, et on rafraîchit en
   arrière-plan. Changer CACHE force la mise à jour. */
const CACHE = 'sabosse-v50';

/* Deux listes distinctes, volontairement.
   FICHIERS : le strict nécessaire pour que l'app démarre hors ligne.
   Si l'un manque, l'installation doit échouer — c'est un vrai problème.
   ASSETS_OPTIONNELS : visuels et sons de Cabosse. Ils sont livrés au
   fil de l'eau ; un PNG ou un WAV absent ne doit JAMAIS empêcher le
   service worker de s'installer, sinon toute l'app resterait bloquée
   sur une ancienne version à cause d'une image manquante. */
const FICHIERS = ['./', './index.html', './manifest.json'];

const ASSETS_OPTIONNELS = [
  './assets/cabosse/stats/energie.png',
  './assets/cabosse/stats/intelligence.png',
  './assets/cabosse/stats/sagesse.png',
  './assets/cabosse/stats/force.png',
  './assets/cabosse/artefacts/cabosse-or.png',
  './assets/cabosse/artefacts/couronne-neuronale.png',
  './assets/cabosse/artefacts/bandeau-maitre.png',
  './assets/cabosse/artefacts/bracelets-gorille.png',
  './assets/cabosse/fonds/bibliotheque.jpg',
  './assets/cabosse/fonds/plage.jpg',
  './assets/sons/reward-small.wav',
  './assets/sons/power-up.wav',
  './assets/sons/level-up-badge.wav',
  './assets/sons/cabosse-happy.wav',
  './assets/sons/revision-reported-soft.wav',
  './assets/sons/revision-cancelled-soft.wav'
].concat(
  /* Les 40 illustrations de rangs. Générées plutôt qu'écrites à la
     main, et toutes optionnelles : celles qui n'existent pas encore
     échouent silencieusement sans bloquer l'installation. */
  Array.from({length: 40}, (_, i) =>
    './assets/cabosse/rangs/cabosse-' + String(i + 1).padStart(2, '0') + '.png')
);

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      c.addAll(FICHIERS).then(() =>
        /* Chaque asset optionnel est tenté isolément : un échec est
           avalé, les autres sont quand même mis en cache. */
        Promise.all(ASSETS_OPTIONNELS.map(u =>
          c.add(u).catch(() => null)))
      )
    ).then(() => self.skipWaiting())
  );
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
