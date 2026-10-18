/**
 * Service Worker PWA Nativo - SuperELotto by P. Alaimo (v32 Pro)
 * Strategia: Network-First per aggiornamenti istantanei + Offline Fallback
 */
const CACHE_NAME = 'superelotto-v32-pro-live-v8';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './favicon.png',
  './pwa-192x192.png',
  './pwa-512x512.png',
  './pwa-maskable-512x512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of ASSETS_TO_CACHE) {
        try {
          const res = await fetch(asset, { cache: 'no-cache' });
          if (res && res.ok) {
            await cache.put(asset, res);
          }
        } catch (e) {
          // ignora singola risorsa opzionale
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => {
          console.log('[SW] Eliminazione vecchia cache:', key);
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;
  // Non intercettare le chiamate API server
  if (url.pathname.startsWith('/api/')) return;

  // Navigazione e index.html: SEMPRE NETWORK FIRST per mostrare gli aggiornamenti subito
  if (event.request.mode === 'navigate' || url.pathname.endsWith('index.html') || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          const indexCached = await caches.match('./index.html');
          if (indexCached) return indexCached;
          return caches.match('./');
        })
    );
    return;
  }

  // Risorse statiche: Network First con fallback su cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'SKIP_WAITING' || event.data.type === 'CLEAR_CACHE')) {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
    self.skipWaiting();
  }
});
