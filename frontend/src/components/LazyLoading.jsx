import React, { Suspense, lazy } from 'react';

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
  </div>
);

// Lazy loaded components
export const LazyOwnerDashboard = lazy(() => import('./OwnerDashboard'));
export const LazyBookingFlow = lazy(() => import('./BookingFlow'));
export const LazyGPSLiveTracking = lazy(() => import('./GPSLiveTracking'));
export const LazyFraudDetectionDashboard = lazy(() => import('./FraudDetectionDashboard'));
export const LazyAIRecommendations = lazy(() => import('./AIRecommendations'));
export const LazyTwoFactorAuth = lazy(() => import('./TwoFactorAuth'));
export const LazyBiometricLogin = lazy(() => import('./BiometricLogin'));

// HOC for lazy loading with suspense
export const withLazyLoading = (Component, fallback = <LoadingSpinner />) => {
  return function WrappedComponent(props) {
    return (
      <Suspense fallback={fallback}>
        <Component {...props} />
      </Suspense>
    );
  };
};

// Image lazy loading component
export const LazyImage = ({ src, alt, className, ...props }) => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);
  const imgRef = React.useRef();

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const img = new Image();
          img.onload = () => {
            setIsLoaded(true);
            observer.disconnect();
          };
          img.onerror = () => {
            setError(true);
            observer.disconnect();
          };
          img.src = src;
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  if (error) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <span className="text-gray-500 text-sm">Image not found</span>
      </div>
    );
  }

  return (
    <div ref={imgRef} className={className}>
      {isLoaded ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" {...props} />
      ) : (
        <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

// Route-based lazy loading
export const LazyRoute = ({ component: Component, ...props }) => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Component {...props} />
    </Suspense>
  );
};