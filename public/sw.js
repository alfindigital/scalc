// PYSCAL service worker — offline-first, opt-in (registered only on production host).
const VERSION = 'pyscal-v1';
const RUNTIME = 'pyscal-runtime-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names.filter((n) => n !== VERSION && n !== RUNTIME).map((n) => caches.delete(n))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Skip cross-origin (Google Fonts, etc.) — let the browser handle it.
  if (url.origin !== self.location.origin) return;

  // Navigation: NetworkFirst, fallback to cached '/'
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(RUNTIME);
        cache.put(req, fresh.clone()).catch(() => {});
        return fresh;
      } catch {
        const cache = await caches.open(RUNTIME);
        const cached = (await cache.match(req)) || (await cache.match('/'));
        return cached || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  // Static assets: StaleWhileRevalidate
  event.respondWith((async () => {
    const cache = await caches.open(RUNTIME);
    const cached = await cache.match(req);
    const fetchPromise = fetch(req)
      .then((res) => {
        if (res && res.status === 200) cache.put(req, res.clone()).catch(() => {});
        return res;
      })
      .catch(() => cached);
    return cached || fetchPromise;
  })());
});
