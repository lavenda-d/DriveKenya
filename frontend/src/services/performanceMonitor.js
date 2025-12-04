import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.listeners = [];
    this.init();
  }

  init() {
    // Collect Web Vitals
    getCLS(this.onMetric.bind(this));
    getFID(this.onMetric.bind(this));
    getFCP(this.onMetric.bind(this));
    getLCP(this.onMetric.bind(this));
    getTTFB(this.onMetric.bind(this));

    // Monitor resource loading
    this.monitorResources();
    
    // Monitor navigation performance
    this.monitorNavigation();
    
    // Monitor errors
    this.monitorErrors();
    
    // Send metrics periodically
    this.startReporting();
  }

  onMetric(metric) {
    this.metrics[metric.name] = metric;
    this.notifyListeners('metric', metric);
    
    // Send to backend
    this.sendMetric(metric);
  }

  monitorResources() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 1000) { // Slow resource
          this.notifyListeners('slowResource', entry);
        }
      }
    });
    
    observer.observe({ entryTypes: ['resource'] });
  }

  monitorNavigation() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const metrics = {
          domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
          loadComplete: entry.loadEventEnd - entry.loadEventStart,
          firstPaint: entry.responseEnd - entry.requestStart,
          domInteractive: entry.domInteractive - entry.domLoading
        };
        
        this.notifyListeners('navigation', metrics);
      }
    });
    
    observer.observe({ entryTypes: ['navigation'] });
  }

  monitorErrors() {
    window.addEventListener('error', (event) => {
      const error = {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: Date.now()
      };
      
      this.notifyListeners('error', error);
      this.sendError(error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      const error = {
        message: 'Unhandled Promise Rejection',
        reason: event.reason,
        timestamp: Date.now()
      };
      
      this.notifyListeners('promiseRejection', error);
      this.sendError(error);
    });
  }

  startReporting() {
    setInterval(() => {
      this.sendBatchMetrics();
    }, 30000); // Send every 30 seconds
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  notifyListeners(type, data) {
    this.listeners.forEach(listener => {
      try {
        listener({ type, data });
      } catch (error) {
        console.error('Performance monitor listener error:', error);
      }
    });
  }

  async sendMetric(metric) {
    try {
      await fetch('/api/performance/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
          id: metric.id,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: Date.now()
        })
      });
    } catch (error) {
      console.error('Failed to send metric:', error);
    }
  }

  async sendError(error) {
    try {
      await fetch('/api/performance/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...error,
          url: window.location.href,
          userAgent: navigator.userAgent
        })
      });
    } catch (err) {
      console.error('Failed to send error:', err);
    }
  }

  async sendBatchMetrics() {
    const metrics = {
      webVitals: this.metrics,
      performance: {
        memory: performance.memory ? {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        } : null,
        timing: performance.timing,
        navigation: performance.navigation
      },
      url: window.location.href,
      timestamp: Date.now()
    };

    try {
      await fetch('/api/performance/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metrics)
      });
    } catch (error) {
      console.error('Failed to send batch metrics:', error);
    }
  }

  getMetrics() {
    return this.metrics;
  }

  getPerformanceScore() {
    const { LCP, FID, CLS, FCP } = this.metrics;
    
    if (!LCP || !FID || !CLS || !FCP) {
      return null;
    }

    // Calculate score based on Web Vitals thresholds
    let score = 0;
    
    // LCP (Largest Contentful Paint)
    if (LCP.value <= 2500) score += 25;
    else if (LCP.value <= 4000) score += 15;
    
    // FID (First Input Delay)
    if (FID.value <= 100) score += 25;
    else if (FID.value <= 300) score += 15;
    
    // CLS (Cumulative Layout Shift)
    if (CLS.value <= 0.1) score += 25;
    else if (CLS.value <= 0.25) score += 15;
    
    // FCP (First Contentful Paint)
    if (FCP.value <= 1800) score += 25;
    else if (FCP.value <= 3000) score += 15;

    return score;
  }
}

// React hook for performance monitoring
import { useEffect, useState } from 'react';

export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState({});
  const [monitor] = useState(() => new PerformanceMonitor());

  useEffect(() => {
    const handleUpdate = ({ type, data }) => {
      if (type === 'metric') {
        setMetrics(prev => ({
          ...prev,
          [data.name]: data
        }));
      }
    };

    monitor.addListener(handleUpdate);
    
    return () => {
      monitor.removeListener(handleUpdate);
    };
  }, [monitor]);

  return {
    metrics,
    score: monitor.getPerformanceScore(),
    monitor
  };
};

export default PerformanceMonitor;