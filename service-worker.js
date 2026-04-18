const CACHE_NAME = 'riki-app-store-v3';
const DYNAMIC_CACHE = 'riki-dynamic-v3';

// Files to cache on install
const STATIC_ASSETS = [
  '/Rikiappstore-devloper-tools/',
  '/Rikiappstore-devloper-tools/index.html',
  '/Rikiappstore-devloper-tools/manifest.json'
];

// No external CSS/JS files - everything is inline in index.html
// But we cache the main HTML which contains all styles and scripts

// Install event - cache core assets
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches and take control
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME && cache !== DYNAMIC_CACHE) {
            console.log('[SW] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - Network First with fallback to cache
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  
  // Skip cross-origin requests
  if (!requestUrl.origin.startsWith(self.location.origin)) {
    return;
  }

  // For HTML requests (navigation) - Network first, then cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the fresh HTML
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                console.log('[SW] Serving HTML from cache');
                return cachedResponse;
              }
              // Fallback to index.html
              return caches.match('/Rikiappstore-devloper-tools/index.html');
            });
        })
    );
    return;
  }

  // For static assets (images, etc.) - Cache First, then Network
  if (event.request.url.match(/\.(png|jpg|jpeg|gif|svg|ico)$/)) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request).then(response => {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(event.request, responseClone);
            });
            return response;
          });
        })
    );
    return;
  }

  // Default: Network First with cache fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache valid responses
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              console.log('[SW] Serving from cache:', event.request.url);
              return cachedResponse;
            }
            // Return offline page for HTML requests
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/Rikiappstore-devloper-tools/index.html');
            }
            return new Response('Offline - RikiAppStore requires internet connection for some features', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({ 'Content-Type': 'text/plain' })
            });
          });
      })
  );
});

// Background sync for offline actions (optional)
self.addEventListener('sync', event => {
  console.log('[SW] Background sync event:', event.tag);
  if (event.tag === 'sync-tools') {
    event.waitUntil(syncToolsData());
  }
});

async function syncToolsData() {
  // Future: sync user data when back online
  console.log('[SW] Syncing tools data...');
}

// Push notification support (optional)
self.addEventListener('push', event => {
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png'
    })
  );
});