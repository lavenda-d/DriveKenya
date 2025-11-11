class PWAService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.serviceWorkerRegistration = null;
    this.updateAvailable = false;
    this.listeners = new Set();
    this.offlineQueue = [];
    
    this.init();
  }

  async init() {
    // Register service worker
    if ('serviceWorker' in navigator) {
      try {
        this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('🚀 PWA: Service Worker registered successfully');
        
        // Listen for updates
        this.serviceWorkerRegistration.addEventListener('updatefound', () => {
          console.log('🔄 PWA: New service worker version found');
          this.handleUpdate();
        });
        
        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          this.handleServiceWorkerMessage(event);
        });
        
      } catch (error) {
        console.error('❌ PWA: Service Worker registration failed:', error);
      }
    }
    
    // Setup online/offline listeners
    window.addEventListener('online', () => {
      console.log('🌐 PWA: Connection restored');
      this.isOnline = true;
      this.notifyListeners('online');
      this.processOfflineQueue();
    });
    
    window.addEventListener('offline', () => {
      console.log('📡 PWA: Connection lost');
      this.isOnline = false;
      this.notifyListeners('offline');
    });
    
    // Setup beforeunload for offline queue
    window.addEventListener('beforeunload', () => {
      this.saveOfflineQueue();
    });
    
    // Load any saved offline queue
    this.loadOfflineQueue();
  }

  // Handle service worker updates
  handleUpdate() {
    if (this.serviceWorkerRegistration && this.serviceWorkerRegistration.waiting) {
      this.updateAvailable = true;
      this.notifyListeners('updateAvailable');
    }
  }

  // Apply service worker update
  async applyUpdate() {
    if (this.serviceWorkerRegistration && this.serviceWorkerRegistration.waiting) {
      this.serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }

  // Handle messages from service worker
  handleServiceWorkerMessage(event) {
    const { data } = event;
    
    switch (data.type) {
      case 'CACHE_UPDATED':
        console.log('📦 PWA: Cache updated');
        this.notifyListeners('cacheUpdated');
        break;
      case 'OFFLINE_READY':
        console.log('📱 PWA: Offline functionality ready');
        this.notifyListeners('offlineReady');
        break;
      default:
        console.log('📨 PWA: Service worker message:', data);
    }
  }

  // Add request to offline queue
  addToOfflineQueue(request) {
    const queueItem = {
      id: Date.now() + Math.random(),
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers),
      body: request.body,
      timestamp: Date.now()
    };
    
    this.offlineQueue.push(queueItem);
    console.log('📤 PWA: Added to offline queue:', queueItem.url);
    
    // Trigger background sync if available
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        return registration.sync.register('background-sync-requests');
      });
    }
  }

  // Process offline queue when back online
  async processOfflineQueue() {
    if (this.offlineQueue.length === 0) return;
    
    console.log(`🔄 PWA: Processing ${this.offlineQueue.length} offline requests`);
    
    const processedItems = [];
    
    for (const item of this.offlineQueue) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body
        });
        
        if (response.ok) {
          processedItems.push(item.id);
          console.log('✅ PWA: Processed offline request:', item.url);
        }
      } catch (error) {
        console.error('❌ PWA: Failed to process offline request:', item.url, error);
      }
    }
    
    // Remove processed items
    this.offlineQueue = this.offlineQueue.filter(item => !processedItems.includes(item.id));
    this.saveOfflineQueue();
    
    if (processedItems.length > 0) {
      this.notifyListeners('offlineQueueProcessed', { processed: processedItems.length });
    }
  }

  // Save offline queue to localStorage
  saveOfflineQueue() {
    try {
      localStorage.setItem('pwa-offline-queue', JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.error('❌ PWA: Failed to save offline queue:', error);
    }
  }

  // Load offline queue from localStorage
  loadOfflineQueue() {
    try {
      const saved = localStorage.getItem('pwa-offline-queue');
      if (saved) {
        this.offlineQueue = JSON.parse(saved);
        console.log(`📤 PWA: Loaded ${this.offlineQueue.length} offline requests`);
      }
    } catch (error) {
      console.error('❌ PWA: Failed to load offline queue:', error);
      this.offlineQueue = [];
    }
  }

  // Check if a URL is cached
  async isCached(url) {
    if (!('caches' in window)) return false;
    
    try {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const response = await cache.match(url);
        if (response) return true;
      }
      return false;
    } catch (error) {
      console.error('❌ PWA: Cache check failed:', error);
      return false;
    }
  }

  // Pre-cache important URLs
  async preCacheUrls(urls) {
    if (!('caches' in window)) return;
    
    try {
      const cache = await caches.open('driveKenya-precache');
      await cache.addAll(urls);
      console.log('📦 PWA: Pre-cached URLs:', urls);
    } catch (error) {
      console.error('❌ PWA: Pre-caching failed:', error);
    }
  }

  // Get cache size and info
  async getCacheInfo() {
    if (!('caches' in window)) return null;
    
    try {
      const cacheNames = await caches.keys();
      let totalSize = 0;
      let totalEntries = 0;
      
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        totalEntries += keys.length;
      }
      
      return {
        caches: cacheNames.length,
        entries: totalEntries,
        estimatedSize: `${(totalEntries * 10).toFixed(1)}KB` // Rough estimate
      };
    } catch (error) {
      console.error('❌ PWA: Cache info failed:', error);
      return null;
    }
  }

  // Clear all caches
  async clearCaches() {
    if (!('caches' in window)) return;
    
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('🗑️ PWA: All caches cleared');
      this.notifyListeners('cachesCleared');
    } catch (error) {
      console.error('❌ PWA: Cache clearing failed:', error);
    }
  }

  // Subscribe to push notifications
  async subscribeToPushNotifications() {
    if (!this.serviceWorkerRegistration) return null;
    
    try {
      const subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          // Your VAPID public key would go here
          'BDynamicKeyWouldGoHere'
        )
      });
      
      console.log('🔔 PWA: Push subscription created');
      return subscription;
    } catch (error) {
      console.error('❌ PWA: Push subscription failed:', error);
      return null;
    }
  }

  // Helper to convert VAPID key
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Event listener management
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(event, data = null) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('❌ PWA: Listener error:', error);
      }
    });
  }

  // Get current status
  getStatus() {
    return {
      isOnline: this.isOnline,
      serviceWorkerRegistered: !!this.serviceWorkerRegistration,
      updateAvailable: this.updateAvailable,
      offlineQueueLength: this.offlineQueue.length,
      isInstalled: window.matchMedia('(display-mode: standalone)').matches
    };
  }
}

// Export singleton instance
export const pwaService = new PWAService();
export default pwaService;