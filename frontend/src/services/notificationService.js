// Enhanced Notification Service with Better Error Handling
import { authStorage } from './api.js';

class NotificationService {
  constructor() {
    this.notificationCount = 0;
    this.listeners = new Set();
    this.notificationListeners = new Set();
    this.isInitialized = false;
    this.lastNotificationCountCall = 0;
    this.initializationInProgress = false;
  }

  // Internal API request helper with better error handling
  async makeApiRequest(endpoint, options = {}) {
    const token = authStorage.getToken();

    // Don't make API calls if no token
    if (!token) {
      console.warn('🔔 No auth token available, skipping notification API call');
      return null;
    }

    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
      ...options,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(url, { ...config, signal: controller.signal });
      clearTimeout(timeoutId);

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('🔔 Non-JSON response from notification API');
        return null;
      }

      const data = await response.json();

      if (!response.ok) {
        // Don't throw on 404 for notifications endpoint (might not exist yet)
        if (response.status === 404) {
          console.warn('🔔 Notifications endpoint not found (404) - feature may not be implemented yet');
          return null;
        }

        // Silent fail on auth errors
        if (response.status === 401) {
          console.warn('🔔 Notification auth failed - token may be expired');
          return null;
        }

        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      // Handle timeout
      if (error.name === 'AbortError') {
        console.warn('🔔 Notification API request timed out');
        return null;
      }

      // Handle network errors silently
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        console.warn('🔔 Network error fetching notifications - backend may be offline');
        return null;
      }

      console.error('🔔 Notification API request failed:', error.message);
      return null;
    }
  }

  // Initialize notification service with better error handling
  async initialize() {
    // Prevent multiple simultaneous initializations
    if (this.initializationInProgress) {
      console.log('🔔 Notification service initialization already in progress, skipping...');
      return;
    }

    if (this.isInitialized) {
      console.log('🔔 Notification service already initialized, skipping...');
      return;
    }

    // Check if user is logged in
    const token = authStorage.getToken();
    if (!token) {
      console.log('🔔 No auth token, skipping notification service initialization');
      return;
    }

    this.initializationInProgress = true;

    try {
      await this.getNotificationCount();
      await this.requestPermission();
      this.isInitialized = true;
      console.log('🔔 Notification service initialized successfully');
    } catch (error) {
      console.warn('🔔 Failed to initialize notification service (non-critical):', error.message);
      // Don't throw - this is a non-critical feature
    } finally {
      this.initializationInProgress = false;
    }
  }

  // Request browser notification permission
  async requestPermission() {
    try {
      if (!('Notification' in window)) {
        console.log('🔔 Browser notifications not supported');
        return 'denied';
      }

      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        console.log('🔔 Notification permission:', permission);
        return permission;
      }

      return Notification.permission;
    } catch (error) {
      console.warn('🔔 Error requesting notification permission:', error.message);
      return 'denied';
    }
  }

  // Get unread notification count with rate limiting
  async getNotificationCount() {
    // Check auth
    if (!authStorage.getToken()) {
      return { total_unread: 0 };
    }

    // Rate limiting
    const now = Date.now();
    const timeDiff = now - this.lastNotificationCountCall;

    if (timeDiff < 2000) {
      console.log('🔔 Notification count call rate limited');
      return { total_unread: this.notificationCount };
    }

    try {
      this.lastNotificationCountCall = now;
      const response = await this.makeApiRequest('/notifications/count');

      if (response && response.data) {
        this.notificationCount = response.data.total_unread || 0;
        this.notifyListeners();
        return response.data;
      }

      return { total_unread: 0 };
    } catch (error) {
      console.warn('🔔 Failed to fetch notification count:', error.message);
      return { total_unread: 0 };
    }
  }

  // Get all notifications with optional filter
  async getAllNotifications(filter = 'all') {
    try {
      const response = await this.makeApiRequest(`/notifications?filter=${filter}`);
      return response?.data || { notifications: [] };
    } catch (error) {
      console.warn('🔔 Failed to fetch notifications:', error.message);
      return { notifications: [] };
    }
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      const response = await this.makeApiRequest(`/notifications/${notificationId}/read`, {
        method: 'PUT'
      });

      if (response) {
        this.notificationCount = Math.max(0, this.notificationCount - 1);
        this.notifyListeners();
      }
    } catch (error) {
      console.warn('🔔 Failed to mark notification as read:', error.message);
    }
  }

  // Mark all notifications as read
  async markAllAsRead() {
    try {
      const response = await this.makeApiRequest('/notifications/read-all', {
        method: 'PUT'
      });

      if (response) {
        this.notificationCount = 0;
        this.notifyListeners();
      }
    } catch (error) {
      console.warn('🔔 Failed to mark all notifications as read:', error.message);
    }
  }

  // Delete notification
  async deleteNotification(notificationId) {
    try {
      await this.makeApiRequest(`/notifications/${notificationId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.warn('🔔 Failed to delete notification:', error.message);
    }
  }

  // Show browser notification
  showBrowserNotification(title, options = {}) {
    try {
      if (!('Notification' in window)) {
        return null;
      }

      if (Notification.permission === 'granted') {
        const notification = new Notification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          ...options
        });

        // Auto-close after 5 seconds
        setTimeout(() => notification.close(), 5000);

        return notification;
      }
    } catch (error) {
      console.warn('🔔 Failed to show browser notification:', error.message);
    }

    return null;
  }

  // Show in-app notification toast
  showToastNotification(message, type = 'info') {
    const toast = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toISOString()
    };

    this.notifyNewNotification({
      type: 'toast',
      data: toast
    });

    return toast;
  }

  // Handle incoming WebSocket notifications
  handleWebSocketNotification(notification) {
    console.log('🔔 Received WebSocket notification:', notification);

    this.incrementCount();

    // Show browser notification if page is hidden
    if (document.hidden && notification.title) {
      this.showBrowserNotification(notification.title, {
        body: notification.message,
        tag: notification.type || 'general'
      });
    }

    // Show in-app toast
    this.showToastNotification(notification.message || notification.title, notification.type);

    // Notify listeners
    this.notifyNewNotification(notification);
  }

  // Update notification count
  updateCount(count) {
    this.notificationCount = count;
    this.notifyListeners();
  }

  // Increment notification count
  incrementCount() {
    this.notificationCount += 1;
    this.notifyListeners();
  }

  // Reset notification count
  resetCount() {
    this.notificationCount = 0;
    this.notifyListeners();
    this.isInitialized = false;
  }

  // Add listener for notification count changes
  addListener(callback) {
    if (typeof callback !== 'function') {
      console.warn('🔔 Invalid callback provided to addListener');
      return () => { };
    }

    this.listeners.add(callback);
    // Immediately call with current count
    callback(this.notificationCount);

    return () => this.listeners.delete(callback);
  }

  // Add listener for new notifications
  addNotificationListener(callback) {
    if (typeof callback !== 'function') {
      console.warn('🔔 Invalid callback provided to addNotificationListener');
      return () => { };
    }

    this.notificationListeners.add(callback);
    return () => this.notificationListeners.delete(callback);
  }

  // Notify all count listeners
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.notificationCount);
      } catch (error) {
        console.error('🔔 Error in notification listener:', error);
      }
    });
  }

  // Notify all notification listeners
  notifyNewNotification(notification) {
    this.notificationListeners.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('🔔 Error in new notification listener:', error);
      }
    });
  }

  // Get current count without API call
  getCurrentCount() {
    return this.notificationCount;
  }

  // Utility methods for different notification types
  notifyBookingUpdate(booking, action) {
    const message = `Booking ${action}: ${booking.carName || 'Vehicle'}`;
    this.showToastNotification(message, 'booking');

    if (document.hidden) {
      this.showBrowserNotification('Booking Update', {
        body: message,
        tag: 'booking-update'
      });
    }
  }

  notifyNewMessage(sender, message) {
    const title = `New message from ${sender}`;
    this.showToastNotification(title, 'message');

    if (document.hidden) {
      this.showBrowserNotification(title, {
        body: message,
        tag: 'new-message'
      });
    }
  }

  notifyPaymentUpdate(amount, status) {
    const message = `Payment ${status}: KSH ${amount.toLocaleString()}`;
    this.showToastNotification(message, 'payment');

    if (document.hidden) {
      this.showBrowserNotification('Payment Update', {
        body: message,
        tag: 'payment-update'
      });
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;