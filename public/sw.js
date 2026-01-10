// Service Worker for PWA with automatic updates
const CACHE_VERSION = 'v2';
const CACHE_NAME = `wand-operator-hub-${CACHE_VERSION}-${Date.now()}`;
const HTML_CACHE = `wand-html-${CACHE_VERSION}`;
const ASSETS_CACHE = `wand-assets-${CACHE_VERSION}`;

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(ASSETS_CACHE).then((cache) => {
      return cache.addAll([
        '/manifest.json',
        '/logo_32.png',
        '/WandLogoNoText.png'
      ]);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !name.startsWith(`wand-html-${CACHE_VERSION}`) &&
                           !name.startsWith(`wand-assets-${CACHE_VERSION}`))
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network-first for HTML, cache-first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Network-first strategy for HTML files (ensures updates are fetched)
  if (request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache the fresh response
          const responseClone = response.clone();
          caches.open(HTML_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match(request);
        })
    );
    return;
  }

  // Cache-first strategy for static assets (CSS, JS, images)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        // Don't cache non-OK responses or non-GET requests
        if (!response || response.status !== 200 || request.method !== 'GET') {
          return response;
        }

        // Clone and cache the response
        const responseClone = response.clone();
        caches.open(ASSETS_CACHE).then((cache) => {
          cache.put(request, responseClone);
        });

        return response;
      });
    })
  );
});

// Listen for messages from the app to check for updates
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
