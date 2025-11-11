import React, { useState, useEffect } from 'react';
import { pwaService } from '../services/pwaService.js';

const PWAStatus = () => {
  const [status, setStatus] = useState(pwaService.getStatus());
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [showOfflineIndicator, setShowOfflineIndicator] = useState(false);

  useEffect(() => {
    const unsubscribe = pwaService.addListener((event, data) => {
      console.log('🔔 PWA Status event:', event, data);
      
      switch (event) {
        case 'updateAvailable':
          setShowUpdatePrompt(true);
          break;
        case 'offline':
          setShowOfflineIndicator(true);
          break;
        case 'online':
          setShowOfflineIndicator(false);
          break;
        case 'offlineQueueProcessed':
          if (data && data.processed > 0) {
            showSyncedNotification(data.processed);
          }
          break;
        default:
          break;
      }
      
      setStatus(pwaService.getStatus());
    });

    return unsubscribe;
  }, []);

  const showSyncedNotification = (count) => {
    // Create temporary notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-slide-in-right';
    notification.innerHTML = `
      <div class="flex items-center space-x-2">
        <span>✅</span>
        <span>Synced ${count} offline action${count > 1 ? 's' : ''}</span>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  const handleUpdateApp = async () => {
    try {
      await pwaService.applyUpdate();
    } catch (error) {
      console.error('Failed to update app:', error);
    }
  };

  const handleDismissUpdate = () => {
    setShowUpdatePrompt(false);
  };

  return (
    <>
      {/* Offline Indicator */}
      {showOfflineIndicator && (
        <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-yellow-600 text-white p-3 rounded-lg shadow-lg z-50 flex items-center space-x-3">
          <div className="text-xl">📡</div>
          <div className="flex-1">
            <div className="font-medium text-sm">You're Offline</div>
            <div className="text-xs text-yellow-100">
              Don't worry! You can still browse and your actions will sync when back online.
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></div>
            <span className="text-xs">Offline Mode</span>
          </div>
        </div>
      )}

      {/* Update Available Prompt */}
      {showUpdatePrompt && (
        <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 border border-blue-400">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">🔄</div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">Update Available</h3>
              <p className="text-xs text-blue-100 mb-3">
                A new version of DriveKenya is ready with bug fixes and improvements.
              </p>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleUpdateApp}
                  className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-2 rounded-md font-medium transition-colors"
                >
                  🚀 Update Now
                </button>
                <button
                  onClick={handleDismissUpdate}
                  className="text-white/70 hover:text-white text-xs px-2 py-2 transition-colors"
                >
                  Later
                </button>
              </div>
            </div>
            
            <button
              onClick={handleDismissUpdate}
              className="text-white/70 hover:text-white text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* PWA Status Indicator (Debug mode - only show in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-black/80 text-white text-xs p-2 rounded-lg font-mono z-40">
          <div className="space-y-1">
            <div className={`flex items-center space-x-2 ${status.isOnline ? 'text-green-400' : 'text-red-400'}`}>
              <span>{status.isOnline ? '🟢' : '🔴'}</span>
              <span>{status.isOnline ? 'Online' : 'Offline'}</span>
            </div>
            
            <div className={`flex items-center space-x-2 ${status.serviceWorkerRegistered ? 'text-green-400' : 'text-yellow-400'}`}>
              <span>{status.serviceWorkerRegistered ? '⚙️' : '❌'}</span>
              <span>SW: {status.serviceWorkerRegistered ? 'Active' : 'None'}</span>
            </div>
            
            {status.offlineQueueLength > 0 && (
              <div className="flex items-center space-x-2 text-blue-400">
                <span>📤</span>
                <span>Queue: {status.offlineQueueLength}</span>
              </div>
            )}
            
            {status.isInstalled && (
              <div className="flex items-center space-x-2 text-purple-400">
                <span>📱</span>
                <span>Installed</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default PWAStatus;