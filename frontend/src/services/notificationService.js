import { authStorage } from './api.js';

class NotificationService {
  constructor() {
    this.notificationCount = 0;
    this.listeners = new Set();
    this.notificationListeners = new Set();
    this.isInitialized = false;
  }

  // Internal API request helper
  async makeApiRequest(endpoint, options = {}) {
    const token = authStorage.getToken();
    const url = `http://localhost:5000/api${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Initialize notification service
  async initialize() {
    if (this.isInitialized) {
      console.log('🔔 Notification service already initialized, skipping...');
      return;
    }
    
    try {
      await this.getNotificationCount();
      await this.requestPermission();
      this.isInitialized = true;
      console.log('🔔 Notification service initialized');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  // Request browser notification permission
  async requestPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      console.log('🔔 Notification permission:', permission);
      return permission;
    }
    return Notification.permission;
  }

  // Get unread notification count
  async getNotificationCount() {
    // Prevent excessive calls by implementing basic rate limiting
    const now = Date.now();
    const lastCall = this.lastNotificationCountCall || 0;
    const timeDiff = now - lastCall;
    
    // Only allow one call per 2 seconds to prevent spam
    if (timeDiff < 2000) {
      console.log('🔔 Notification count call rate limited (too frequent)');
      return { total_unread: this.notificationCount };
    }
    
    try {
      this.lastNotificationCountCall = now;
      const response = await this.makeApiRequest('/notifications/count');
      this.notificationCount = response.data?.total_unread || 0;
      this.notifyListeners();
      return response.data;
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
      return { total_unread: 0 };
    }
  }

  // Get all notifications with optional filter
  async getAllNotifications(filter = 'all') {
    try {
      const response = await this.makeApiRequest(`/notifications?filter=${filter}`);
      return response.data || { notifications: [] };
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      return { notifications: [] };
    }
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      await this.makeApiRequest(`/notifications/${notificationId}/read`, {
        method: 'PUT'
      });
      this.notificationCount = Math.max(0, this.notificationCount - 1);
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  async markAllAsRead() {
    try {
      await this.makeApiRequest('/notifications/read-all', {
        method: 'PUT'
      });
      this.notificationCount = 0;
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  // Delete notification
  async deleteNotification(notificationId) {
    try {
      await this.makeApiRequest(`/notifications/${notificationId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw error;
    }
  }

  // Create new notification (for internal use)
  async createNotification(data) {
    try {
      const response = await this.makeApiRequest('/notifications', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      this.incrementCount();
      this.notifyNewNotification(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw error;
    }
  }

  // Show browser notification
  showBrowserNotification(title, options = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      return notification;
    }
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
    
    // Update count
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

  // Update notification count (called when new notification received)
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
  }

  // Add listener for notification count changes
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Add listener for new notifications
  addNotificationListener(callback) {
    this.notificationListeners.add(callback);
    return () => this.notificationListeners.delete(callback);
  }

  // Notify all count listeners
  notifyListeners() {
    this.listeners.forEach(callback => callback(this.notificationCount));
  }

  // Notify all notification listeners
  notifyNewNotification(notification) {
    this.notificationListeners.forEach(callback => callback(notification));
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

  // Increment notification count when new notifications arrive via WebSocket
  incrementNotificationCount() {
    this.notificationCount++;
    this.notifyListeners();
    console.log('🔔 Notification count incremented to:', this.notificationCount);
  }

  // Decrement notification count when notifications are marked as read
  decrementNotificationCount(amount = 1) {
    this.notificationCount = Math.max(0, this.notificationCount - amount);
    this.notifyListeners();
    console.log('🔔 Notification count decremented to:', this.notificationCount);
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;