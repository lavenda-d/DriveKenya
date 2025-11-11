import React, { useState, useEffect } from 'react';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
    setIsInstalled(window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches);

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      console.log('🚀 PWA: Install prompt available');
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('🎉 PWA: App successfully installed');
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      // Show the install prompt
      const result = await deferredPrompt.prompt();
      console.log('🚀 PWA: Install prompt result:', result.outcome);

      if (result.outcome === 'accepted') {
        console.log('✅ PWA: User accepted the install prompt');
      } else {
        console.log('❌ PWA: User dismissed the install prompt');
      }

      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    } catch (error) {
      console.error('❌ PWA: Install prompt failed:', error);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Don't show again for this session
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't show if already installed or recently dismissed
  if (isInstalled || isStandalone) return null;
  
  const dismissedTime = localStorage.getItem('pwa-install-dismissed');
  if (dismissedTime && (Date.now() - parseInt(dismissedTime)) < 24 * 60 * 60 * 1000) {
    return null; // Dismissed within last 24 hours
  }

  if (!showInstallPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-lg shadow-lg z-50 border border-white/20 backdrop-blur-sm">
      <div className="flex items-start space-x-3">
        <div className="text-2xl">📱</div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">Install DriveKenya</h3>
          <p className="text-xs text-white/90 mb-3">
            Add to your home screen for quick access, offline support, and a native app experience!
          </p>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleInstallClick}
              className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-2 rounded-md font-medium transition-colors"
            >
              ⬇️ Install
            </button>
            <button
              onClick={handleDismiss}
              className="text-white/70 hover:text-white text-xs px-2 py-2 transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
        
        <button
          onClick={handleDismiss}
          className="text-white/70 hover:text-white text-lg leading-none"
        >
          ×
        </button>
      </div>
      
      {/* Features highlight */}
      <div className="mt-3 pt-3 border-t border-white/20">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center space-x-1">
            <span>🚀</span>
            <span>Fast loading</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>📱</span>
            <span>Mobile optimized</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>🔄</span>
            <span>Offline support</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>🔔</span>
            <span>Push notifications</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;