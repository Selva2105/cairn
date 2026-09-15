const CACHE_NAME = 'cairn-shell-v1';
const SHELL_ASSETS = ['/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      ),
  );
  self.clients.claim();
});

// Network-first for navigations (dashboard data changes constantly), falling back to the
// cached shell only when fully offline -- this is not an offline-data app, just a friendlier
// "you're offline" experience than a browser error page.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request).then((cached) => cached ?? caches.match('/manifest.json'))),
    );
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached ?? fetch(event.request)),
    );
  }
});
