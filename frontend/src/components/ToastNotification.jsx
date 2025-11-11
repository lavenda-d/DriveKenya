import React, { useState, useEffect } from 'react';
import { notificationService } from '../services/notificationService.js';

const ToastNotification = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsubscribe = notificationService.addNotificationListener((notification) => {
      if (notification.type === 'toast' && notification.data) {
        addToast(notification.data);
      }
    });

    return unsubscribe;
  }, []);

  const addToast = (toast) => {
    setToasts(prev => [...prev, toast]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeToast(toast.id);
    }, 5000);
  };

  const removeToast = (toastId) => {
    setToasts(prev => prev.filter(toast => toast.id !== toastId));
  };

  const getToastIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'booking': return '📅';
      case 'message': return '💬';
      case 'payment': return '💳';
      default: return 'ℹ️';
    }
  };

  const getToastColor = (type) => {
    switch (type) {
      case 'success': return 'bg-green-500 border-green-600';
      case 'error': return 'bg-red-500 border-red-600';
      case 'warning': return 'bg-yellow-500 border-yellow-600';
      case 'booking': return 'bg-blue-500 border-blue-600';
      case 'message': return 'bg-purple-500 border-purple-600';
      case 'payment': return 'bg-orange-500 border-orange-600';
      default: return 'bg-gray-500 border-gray-600';
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            max-w-sm w-full border-l-4 p-4 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out
            animate-slide-in-right text-white ${getToastColor(toast.type)}
          `}
        >
          <div className="flex items-start">
            <span className="text-lg mr-3">{getToastIcon(toast.type)}</span>
            <div className="flex-1">
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 text-white hover:text-gray-200 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ToastNotification;