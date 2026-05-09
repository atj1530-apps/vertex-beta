/* Vertex Workout Builder — PWA Service Worker
   v20260506 — bump CACHE_NAME date on every deploy to bust old caches.
   Network-first for HTML so new deploys are always visible immediately. */

const CACHE_NAME = 'vertex-v20260515';
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
      .then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => {
          console.log('[SW] Deleting old cache:', key);
          return caches.delete(key);
        })
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return;

  // Never intercept external services
  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname.includes('unpkg.com')) return;
  if (url.hostname.includes('youtube')) return;
  if (url.hostname.includes('googleapis.com')) return;

  // Network-first for navigation/HTML — ensures latest deploy is always visible
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Cache-first for static PWA assets (icons, manifest)
  if (url.origin === self.location.origin && (
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('manifest.json')
  )) {
    event.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
  }
});
