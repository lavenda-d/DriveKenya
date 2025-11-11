import { useState, useEffect } from 'react';
import { notificationService } from '../services/notificationService.js';
import { chatService } from '../services/chatService.js';

const NotificationBadge = ({ children, className = '' }) => {
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    // Initial load
    notificationService.getNotificationCount();

    // Listen for notification count changes
    const unsubscribe = notificationService.addListener(setNotificationCount);

    // Request notification permission on mount
    chatService.requestNotificationPermission();

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      {children}
      {notificationCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
          {notificationCount > 99 ? '99+' : notificationCount}
        </span>
      )}
    </div>
  );
};

export default NotificationBadge;