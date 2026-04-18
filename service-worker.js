const CACHE_NAME = 'riki-app-store-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json'
];

// Install event - cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Fetch event - serve from cache then network (Stale-While-Revalidate)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          // Return cached version and update cache in background
          fetch(event.request).then(freshResponse => {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, freshResponse);
            });
          });
          return response;
        }
        return fetch(event.request).then(freshResponse => {
          // Don't cache non-GET or external APIs
          if (!event.request.url.includes('/api/') && event.request.method === 'GET') {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, freshResponse.clone());
            });
          }
          return freshResponse;
        });
      })
      .catch(() => {
        // Offline fallback page (optional)
        return caches.match('/index.html');
      })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});
