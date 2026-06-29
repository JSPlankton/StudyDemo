const PRECACHE_NAME = 'study-plan-precache-v7';
const RUNTIME_CACHE_NAME = 'study-plan-runtime-v7';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './assets/icon.svg',
  './src/app.js',
  './src/app-core.mjs',
  './src/content.mjs',
  './src/exams.mjs',
  './src/sync-client.mjs',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE_NAME).then((cache) => cache.addAll(ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const keep = new Set([PRECACHE_NAME, RUNTIME_CACHE_NAME]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

function cacheable(response) {
  return response && response.ok && response.type === 'basic';
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (cacheable(response)) {
      const cache = await caches.open(RUNTIME_CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || caches.match('./index.html');
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const network = fetch(request)
    .then(async (response) => {
      if (cacheable(response)) {
        const cache = await caches.open(RUNTIME_CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    return;
  }

  const acceptsHtml = event.request.headers.get('accept')?.includes('text/html');
  if (event.request.mode === 'navigate' || acceptsHtml) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  const moduleResource = /\.(?:js|mjs)$/i.test(url.pathname) || url.pathname.endsWith('/sw.js');
  if (moduleResource) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(staleWhileRevalidate(event.request));
});
