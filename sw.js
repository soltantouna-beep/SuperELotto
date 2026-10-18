/**
 * Service Worker PWA Nativo - SuperELotto by P. Alaimo (v32 Pro)
 * Strategia: Network-First senza cache persistente per aggiornamenti immediati
 */
const CACHE_NAME = 'superelotto-v32-pro-live-v8';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(event.request, { cache: 'no-store', credentials: 'same-origin' })
      .then((response) => {
        if (response && response.ok) return response;
        return caches.match(event.request);
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        const indexCached = await caches.match('/index.html');
        if (indexCached) return indexCached;
        return new Response('Service Unavailable', { status: 503, statusText: 'Service Unavailable' });
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'SKIP_WAITING' || event.data.type === 'CLEAR_CACHE')) {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
    self.skipWaiting();
  }
});
