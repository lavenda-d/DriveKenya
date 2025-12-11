class CacheManager {
  constructor() {
    this.memory = new Map();
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxSize: 100,
      cleanupInterval: 60 * 1000 // 1 minute
    };
    this.startCleanup();
  }

  // Set cache with TTL
  set(key, value, ttl = this.config.defaultTTL) {
    const expires = Date.now() + ttl;
    this.memory.set(key, { value, expires });
    
    // Store in localStorage for persistence
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify({ value, expires }));
    } catch (error) {
      console.warn('LocalStorage cache set failed:', error);
    }
    
    this.evictIfNeeded();
  }

  // Get from cache
  get(key) {
    // Check memory first
    const memItem = this.memory.get(key);
    if (memItem && memItem.expires > Date.now()) {
      return memItem.value;
    }

    // Check localStorage
    try {
      const stored = localStorage.getItem(`cache_${key}`);
      if (stored) {
        const item = JSON.parse(stored);
        if (item.expires > Date.now()) {
          // Restore to memory
          this.memory.set(key, item);
          return item.value;
        } else {
          localStorage.removeItem(`cache_${key}`);
        }
      }
    } catch (error) {
      console.warn('LocalStorage cache get failed:', error);
    }

    return null;
  }

  // Check if key exists and is valid
  has(key) {
    return this.get(key) !== null;
  }

  // Delete cache entry
  delete(key) {
    this.memory.delete(key);
    localStorage.removeItem(`cache_${key}`);
  }

  // Clear all cache
  clear() {
    this.memory.clear();
    // Clear cache items from localStorage
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cache_')) {
        localStorage.removeItem(key);
      }
    }
  }

  // Evict oldest entries if cache is too large
  evictIfNeeded() {
    if (this.memory.size > this.config.maxSize) {
      const oldest = this.memory.keys().next().value;
      this.delete(oldest);
    }
  }

  // Cleanup expired entries
  cleanup() {
    const now = Date.now();
    
    // Clean memory cache
    for (const [key, item] of this.memory.entries()) {
      if (item.expires <= now) {
        this.memory.delete(key);
      }
    }

    // Clean localStorage cache
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cache_')) {
        try {
          const item = JSON.parse(localStorage.getItem(key));
          if (item.expires <= now) {
            localStorage.removeItem(key);
          }
        } catch (error) {
          localStorage.removeItem(key);
        }
      }
    }
  }

  // Start automatic cleanup
  startCleanup() {
    setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  // Get cache stats
  getStats() {
    return {
      memorySize: this.memory.size,
      localStorageKeys: Object.keys(localStorage).filter(k => k.startsWith('cache_')).length
    };
  }
}

// API Cache wrapper
export class APICache {
  constructor() {
    this.cache = new CacheManager();
  }

  async get(url, options = {}) {
    const cacheKey = this.generateKey(url, options);
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && !options.forceRefresh) {
      return cached;
    }

    // Fetch from API
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      
      // Cache successful responses
      if (response.ok) {
        this.cache.set(cacheKey, data, options.ttl);
      }
      
      return data;
    } catch (error) {
      // Return cached version on error if available
      if (cached) {
        console.warn('API error, returning cached data:', error);
        return cached;
      }
      throw error;
    }
  }

  generateKey(url, options) {
    const params = new URLSearchParams(options.params || {});
    return `${url}?${params.toString()}`;
  }

  invalidate(pattern) {
    // Remove cache entries matching pattern
    for (const [key] of this.cache.memory.entries()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

// React hook for cached API calls
import { useState, useEffect } from 'react';

export const useCachedAPI = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiCache] = useState(() => new APICache());

  useEffect(() => {
    let mounted = true;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await apiCache.get(url, options);
        
        if (mounted) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    
    return () => {
      mounted = false;
    };
  }, [url, JSON.stringify(options)]);

  const refetch = () => {
    apiCache.invalidate(url);
    // Re-trigger effect
    setLoading(true);
  };

  return { data, loading, error, refetch };
};

// Image cache for lazy loading
export class ImageCache {
  constructor() {
    this.cache = new Map();
  }

  async load(src) {
    if (this.cache.has(src)) {
      return this.cache.get(src);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.cache.set(src, img);
        resolve(img);
      };
      
      img.onerror = () => {
        reject(new Error(`Failed to load image: ${src}`));
      };
      
      img.src = src;
    });
  }

  preload(urls) {
    return Promise.all(urls.map(url => this.load(url)));
  }

  has(src) {
    return this.cache.has(src);
  }

  clear() {
    this.cache.clear();
  }

  getSize() {
    return this.cache.size;
  }
}

// Service Worker cache management
export class ServiceWorkerCache {
  constructor() {
    this.isSupported = 'serviceWorker' in navigator;
  }

  async register() {
    if (!this.isSupported) return false;

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }

  async postMessage(message) {
    if (!this.isSupported) return;

    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage(message);
  }

  async clearCache(cacheName) {
    await this.postMessage({
      type: 'CLEAR_CACHE',
      cacheName
    });
  }

  async updateCache() {
    await this.postMessage({
      type: 'UPDATE_CACHE'
    });
  }
}

const cacheManager = new CacheManager();
const imageCache = new ImageCache();
const swCache = new ServiceWorkerCache();

export { cacheManager, imageCache, swCache };
export default CacheManager;