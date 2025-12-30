const CACHE_NAME = 'driveKenya-v1.0.0';
const STATIC_CACHE_NAME = 'driveKenya-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'driveKenya-dynamic-v1.0.0';

// Files to cache immediately (App Shell)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css',
  '/offline.html', // Offline fallback page
  // Fonts and critical CSS will be cached dynamically
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/cars/,
  /\/api\/auth\/me/,
  /\/api\/notifications\/count/,
];

// Routes that should always go to network first
const NETWORK_FIRST_PATTERNS = [
  /\/api\/auth\/login/,
  /\/api\/auth\/register/,
  /\/api\/bookings/,
  /\/api\/notifications/,
  /\/api\/messages/,
];

// Install event - Cache static assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing');

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Caching App Shell');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker: App Shell cached');
        return self.skipWaiting(); // Force activation
      })
      .catch((error) => {
        console.error('❌ Service Worker: Failed to cache App Shell', error);
      })
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete old caches
              return cacheName !== STATIC_CACHE_NAME &&
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName.startsWith('driveKenya-');
            })
            .map((cacheName) => {
              console.log('🗑️ Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Cleanup complete');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch event - Handle requests with caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    // API requests
    event.respondWith(handleApiRequest(request));
  } else if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/)) {
    // Static assets
    event.respondWith(handleStaticAssets(request));
  } else {
    // HTML pages (SPA navigation)
    event.respondWith(handleNavigation(request));
  }
});

// Network first strategy for API requests
async function handleApiRequest(request) {
  const url = new URL(request.url);

  try {
    // Always try network first for critical API calls
    if (NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname))) {
      const networkResponse = await fetch(request);

      // Cache successful responses (excluding partial 206)
      if (networkResponse.status === 200) {
        const cache = await caches.open(DYNAMIC_CACHE_NAME);
        cache.put(request, networkResponse.clone());
      }

      return networkResponse;
    }

    // For cacheable APIs, try cache first, then network
    if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
      const cachedResponse = await caches.match(request);

      if (cachedResponse) {
        // Update cache in background
        updateCacheInBackground(request);
        return cachedResponse;
      }
    }

    // Fall back to network
    const networkResponse = await fetch(request);

    // Cache successful API responses
    if (networkResponse.status === 200 && API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;

  } catch (error) {
    console.log('🌐 Service Worker: Network failed for API, trying cache', request.url);

    // Try to serve from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline response for failed API calls
    return new Response(
      JSON.stringify({
        success: false,
        message: 'You are offline. Please check your connection.',
        offline: true
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Cache first strategy for static assets
async function handleStaticAssets(request) {
  try {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);

    // Cache static assets (only full 200 responses)
    if (networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;

  } catch (error) {
    console.log('🌐 Service Worker: Failed to load static asset', request.url);

    // For images, return a placeholder
    if (request.url.match(/\.(png|jpg|jpeg|gif|svg)$/)) {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f3f4f6"/><text x="100" y="100" text-anchor="middle" fill="#6b7280" font-family="Arial">Offline</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }

    throw error;
  }
}

// Handle navigation (SPA)
async function handleNavigation(request) {
  try {
    // Try network first for navigation
    const networkResponse = await fetch(request);

    // Cache successful HTML responses
    if (networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;

  } catch (error) {
    console.log('🌐 Service Worker: Network failed for navigation, serving app shell');

    // Serve cached version or app shell
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fallback to main app (SPA behavior)
    const appShell = await caches.match('/');
    if (appShell) {
      return appShell;
    }

    // Ultimate fallback to offline page
    return caches.match('/offline.html');
  }
}

// Background cache update
async function updateCacheInBackground(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse);
    }
  } catch (error) {
    console.log('🔄 Service Worker: Background update failed for', request.url);
  }
}

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 Service Worker: Background sync triggered', event.tag);

  if (event.tag === 'background-sync-bookings') {
    event.waitUntil(syncOfflineBookings());
  } else if (event.tag === 'background-sync-messages') {
    event.waitUntil(syncOfflineMessages());
  }
});

// Sync offline bookings when connection is restored
async function syncOfflineBookings() {
  try {
    // Get offline booking data from IndexedDB
    const offlineBookings = await getOfflineData('bookings');

    for (const booking of offlineBookings) {
      try {
        const response = await fetch('/api/bookings/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': booking.token
          },
          body: JSON.stringify(booking.data)
        });

        if (response.ok) {
          // Remove from offline storage
          await removeOfflineData('bookings', booking.id);
          console.log('✅ Service Worker: Synced offline booking', booking.id);
        }
      } catch (error) {
        console.error('❌ Service Worker: Failed to sync booking', booking.id, error);
      }
    }
  } catch (error) {
    console.error('❌ Service Worker: Background sync failed', error);
  }
}

// Sync offline messages when connection is restored
async function syncOfflineMessages() {
  try {
    const offlineMessages = await getOfflineData('messages');

    for (const message of offlineMessages) {
      try {
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': message.token
          },
          body: JSON.stringify(message.data)
        });

        if (response.ok) {
          await removeOfflineData('messages', message.id);
          console.log('✅ Service Worker: Synced offline message', message.id);
        }
      } catch (error) {
        console.error('❌ Service Worker: Failed to sync message', message.id, error);
      }
    }
  } catch (error) {
    console.error('❌ Service Worker: Message sync failed', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('🔔 Service Worker: Push notification received');

  const options = {
    badge: '/icons/icon-72x72.png',
    icon: '/icons/icon-192x192.png',
    vibrate: [200, 100, 200],
    data: event.data ? event.data.json() : {},
    actions: [
      {
        action: 'view',
        title: 'View Details',
        icon: '/icons/action-view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/action-dismiss.png'
      }
    ]
  };

  if (event.data) {
    const payload = event.data.json();
    options.title = payload.title || 'DriveKenya';
    options.body = payload.body || 'You have a new notification';
    options.tag = payload.tag || 'general';
  } else {
    options.title = 'DriveKenya';
    options.body = 'You have a new notification';
  }

  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Service Worker: Notification clicked', event.action);

  event.notification.close();

  if (event.action === 'view') {
    // Open the app to relevant page
    const urlToOpen = event.notification.data.url || '/';

    event.waitUntil(
      clients.matchAll().then((clientList) => {
        // If app is already open, focus it
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }

        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});

// Helper functions for IndexedDB operations
async function getOfflineData(storeName) {
  // This would integrate with your offline storage implementation
  return [];
}

async function removeOfflineData(storeName, id) {
  // This would integrate with your offline storage implementation
  return true;
}

// Cache size management
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxItems) {
    const keysToDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(keysToDelete.map(key => cache.delete(key)));
    console.log(`🗑️ Service Worker: Cleaned ${keysToDelete.length} items from ${cacheName}`);
  }
}

// Periodic cache cleanup
setInterval(() => {
  limitCacheSize(DYNAMIC_CACHE_NAME, 100);
}, 1000 * 60 * 60); // Every hour