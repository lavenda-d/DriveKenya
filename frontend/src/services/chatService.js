import { io } from 'socket.io-client';
import { authStorage } from './api.js';
import notificationService from './notificationService.js';

class ChatService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.messageHandlers = new Set();
    this.notificationHandlers = new Set();
    this.typingHandlers = new Set();
    this.connectionHandlers = new Set();
  }

  // Initialize socket connection
  connect() {
    const token = authStorage.getToken();
    if (!token) {
      console.warn('❌ No token available for chat connection');
      return;
    }

    console.log('🔌 Attempting to connect to chat server with token:', token ? 'Present' : 'Missing');

    if (this.socket) {
      this.disconnect();
    }

    this.socket = io(import.meta.env.VITE_WEBSOCKET_URL || 'http://localhost:5000', {
      auth: {
        token: token
      }
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to chat server');
      this.isConnected = true;
      this.notifyConnectionHandlers(true);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from chat server');
      this.isConnected = false;
      this.notifyConnectionHandlers(false);
    });

    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
      this.notifyConnectionHandlers(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      this.notifyConnectionHandlers(false);
    });

    // Listen for new messages
    this.socket.on('new_message', (message) => {
      this.notifyMessageHandlers(message);
    });

    // Listen for chat history
    this.socket.on('chat_history', (data) => {
      this.notifyMessageHandlers(data, 'history');
    });

    // Listen for chat joined confirmation
    this.socket.on('chat_joined', (data) => {
      console.log('✅ Successfully joined chat room:', data.room);
    });

    // Listen for typing indicators
    this.socket.on('user_typing', (data) => {
      this.notifyTypingHandlers(data);
    });

    // Listen for notifications
    this.socket.on('notification', (notification) => {
      this.notifyNotificationHandlers(notification);
    });

    // Listen for booking updates
    this.socket.on('booking_update', (bookingData) => {
      this.notifyNotificationHandlers({
        type: 'booking_update',
        data: bookingData,
        message: 'Your booking has been updated'
      });
    });

    // Listen for new message notifications
    this.socket.on('new_notification', (notification) => {
      console.log('🔔 Received notification:', notification);

      // Update notification service count
      notificationService.incrementNotificationCount();

      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification(`New message from ${notification.senderName}`, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: notification.chatRoom
        });
      }

      // Notify app components
      this.notifyNotificationHandlers({
        type: 'new_message_notification',
        data: notification,
        message: `New message from ${notification.senderName}`
      });
    });
  }

  // Disconnect from socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Join a chat room for a specific car
  joinChat(carId, ownerId) {
    if (!this.socket || !this.isConnected) {
      console.warn('Socket not connected');
      return;
    }

    this.socket.emit('join_chat', { carId, ownerId });
  }

  // Send a message
  sendMessage(message, chatRoom) {
    console.log('🚀 Attempting to send message:', message);
    console.log('📡 Socket connected:', !!this.socket);
    console.log('🔗 Is connected:', this.isConnected);
    console.log('🏠 Chat room:', chatRoom);

    if (!this.socket) {
      console.error('❌ No socket connection');
      return;
    }

    if (!this.isConnected) {
      console.error('❌ Socket not connected');
      return;
    }

    if (!chatRoom) {
      console.error('❌ No chat room specified');
      return;
    }

    console.log('✅ Sending message via socket...');
    this.socket.emit('send_message', { message, chatRoom });
  }

  // Send typing indicators
  startTyping() {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit('typing_start');
  }

  stopTyping() {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit('typing_stop');
  }

  // Event handlers management
  onMessage(handler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onNotification(handler) {
    this.notificationHandlers.add(handler);
    return () => this.notificationHandlers.delete(handler);
  }

  onTyping(handler) {
    this.typingHandlers.add(handler);
    return () => this.typingHandlers.delete(handler);
  }

  onConnection(handler) {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  // Notify handlers
  notifyMessageHandlers(data, type = 'message') {
    this.messageHandlers.forEach(handler => handler(data, type));
  }

  notifyNotificationHandlers(notification) {
    this.notificationHandlers.forEach(handler => handler(notification));
  }

  notifyTypingHandlers(data) {
    this.typingHandlers.forEach(handler => handler(data));
  }

  notifyConnectionHandlers(isConnected) {
    this.connectionHandlers.forEach(handler => handler(isConnected));
  }

  // Mark messages as read in a chat room
  markMessagesAsRead(chatRoom) {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit('mark_messages_read', { chatRoom });
  }

  // Request browser notification permission
  async requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      console.log('🔔 Notification permission:', permission);
      return permission;
    }
    return Notification.permission;
  }

  // Helper to generate chat room ID
  generateChatRoom(carId, userId, ownerId) {
    const minId = Math.min(userId, ownerId);
    const maxId = Math.max(userId, ownerId);
    return `chat_${carId}_${minId}_${maxId}`;
  }
}

// Export singleton instance
export const chatService = new ChatService();

// React hook for easy chat integration
export const useChatService = () => {
  return chatService;
};

export default chatService;