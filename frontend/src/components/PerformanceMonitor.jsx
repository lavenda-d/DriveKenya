import React, { useEffect, useState } from 'react';
import { Activity, AlertCircle, TrendingUp, Clock, Zap } from 'lucide-react';

const PerformanceMonitor = () => {
  const [metrics, setMetrics] = useState({
    fcp: 0,
    lcp: 0,
    cls: 0,
    fid: 0,
    ttfb: 0
  });
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    // Monitor Web Vitals
    if ('PerformanceObserver' in window) {
      // First Contentful Paint
      const fcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            setMetrics(prev => ({ ...prev, fcp: entry.startTime }));
            console.log('📊 FCP:', entry.startTime.toFixed(2), 'ms');
          }
        }
      });
      
      try {
        fcpObserver.observe({ entryTypes: ['paint'] });
      } catch (e) {
        console.warn('FCP observer not supported');
      }

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        setMetrics(prev => ({ ...prev, lcp: lastEntry.renderTime || lastEntry.loadTime }));
        console.log('📊 LCP:', (lastEntry.renderTime || lastEntry.loadTime).toFixed(2), 'ms');
      });
      
      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.warn('LCP observer not supported');
      }

      // Cumulative Layout Shift
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            setMetrics(prev => ({ ...prev, cls: clsValue }));
            console.log('📊 CLS:', clsValue.toFixed(3));
          }
        }
      });
      
      try {
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.warn('CLS observer not supported');
      }

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          setMetrics(prev => ({ ...prev, fid: entry.processingStart - entry.startTime }));
          console.log('📊 FID:', (entry.processingStart - entry.startTime).toFixed(2), 'ms');
        }
      });
      
      try {
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        console.warn('FID observer not supported');
      }
    }

    // Monitor Navigation Timing
    if (performance.timing) {
      const ttfb = performance.timing.responseStart - performance.timing.requestStart;
      setMetrics(prev => ({ ...prev, ttfb }));
      console.log('📊 TTFB:', ttfb, 'ms');
    }

    // Error tracking
    const errorHandler = (event) => {
      const error = {
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        timestamp: new Date().toISOString()
      };
      setErrors(prev => [error, ...prev].slice(0, 10));
      console.error('❌ Performance Error:', error);
    };

    window.addEventListener('error', errorHandler);

    return () => {
      window.removeEventListener('error', errorHandler);
    };
  }, []);

  const getScoreColor = (metric, value) => {
    if (metric === 'fcp') return value < 1800 ? 'text-green-500' : value < 3000 ? 'text-yellow-500' : 'text-red-500';
    if (metric === 'lcp') return value < 2500 ? 'text-green-500' : value < 4000 ? 'text-yellow-500' : 'text-red-500';
    if (metric === 'cls') return value < 0.1 ? 'text-green-500' : value < 0.25 ? 'text-yellow-500' : 'text-red-500';
    if (metric === 'fid') return value < 100 ? 'text-green-500' : value < 300 ? 'text-yellow-500' : 'text-red-500';
    if (metric === 'ttfb') return value < 800 ? 'text-green-500' : value < 1800 ? 'text-yellow-500' : 'text-red-500';
    return 'text-gray-500';
  };

  return (
    <div className="hidden">
      {/* Performance monitoring runs silently in background */}
      <div className="fixed bottom-4 right-4 bg-gray-900/90 text-white p-2 rounded-lg text-xs max-w-xs z-50">
        <div className="flex items-center space-x-2 mb-2">
          <Activity className="h-4 w-4" />
          <span className="font-semibold">Performance Monitor</span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>FCP:</span>
            <span className={getScoreColor('fcp', metrics.fcp)}>{metrics.fcp.toFixed(0)}ms</span>
          </div>
          <div className="flex justify-between">
            <span>LCP:</span>
            <span className={getScoreColor('lcp', metrics.lcp)}>{metrics.lcp.toFixed(0)}ms</span>
          </div>
          <div className="flex justify-between">
            <span>CLS:</span>
            <span className={getScoreColor('cls', metrics.cls)}>{metrics.cls.toFixed(3)}</span>
          </div>
          {errors.length > 0 && (
            <div className="text-red-500 flex items-center space-x-1">
              <AlertCircle className="h-3 w-3" />
              <span>{errors.length} errors</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitor;
