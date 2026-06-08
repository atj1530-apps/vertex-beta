/* Vertex Workout Builder — PWA Service Worker
   v20260601-6a65-option-a-layout
   Network-first for HTML so deploys are visible immediately.
   Workout History scoped to Progress only; delete tombstones prevent deleted rows from returning.
*/
const CACHE_NAME = 'vertex-v20260608-6a98f-flash-fix5';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.hostname.includes('supabase') ||
      url.hostname.includes('anthropic') ||
      url.hostname.includes('unpkg.com') ||
      url.hostname.includes('cdnjs.cloudflare.com') ||
      url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    return;
  }

  if (req.mode === 'navigate' || req.destination === 'document') {
    // Race the network against a 5-second timeout — if the network is slow,
    // serve the cached page immediately rather than spinning for minutes.
    const networkFetch = fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => undefined);
      return res;
    });
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('sw-timeout')), 5000)
    );
    event.respondWith(
      Promise.race([networkFetch, timeout])
        .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (req.method === 'GET' && res && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => undefined);
      }
      return res;
    }).catch(() => cached))
  );
});
