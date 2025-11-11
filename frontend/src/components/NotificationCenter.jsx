import React, { useState, useEffect } from 'react';
import { notificationService } from '../services/notificationService.js';
import { chatService } from '../services/chatService.js';

const NotificationCenter = ({ isOpen, onClose, user }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, unread, messages, bookings, system

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, filter]);

  // Subscribe to real-time notification updates
  useEffect(() => {
    const unsubscribeNotifications = notificationService.addNotificationListener((notification) => {
      console.log('🔔 NotificationCenter received new notification:', notification);
      // Reload notifications when new ones arrive
      if (isOpen) {
        loadNotifications();
      }
    });

    const unsubscribeChatNotifications = chatService.onNotification((notification) => {
      console.log('🔔 NotificationCenter received chat notification:', notification);
      // Reload notifications when chat notifications arrive
      if (isOpen) {
        loadNotifications();
      }
    });

    return () => {
      unsubscribeNotifications();
      unsubscribeChatNotifications();
    };
  }, [isOpen]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationService.getAllNotifications(filter);
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read first
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    console.log('🎯 Notification clicked:', notification);

    // Handle different notification types
    if (notification.type === 'message' || notification.type === 'new_message' || notification.type === 'missed_message') {
      // Parse data if it's a string
      let notificationData = notification.data;
      if (typeof notificationData === 'string') {
        try {
          notificationData = JSON.parse(notificationData);
        } catch (e) {
          console.error('Failed to parse notification data:', e);
          notificationData = {};
        }
      }

      // Extract chat room info from notification data
      const chatRoom = notificationData?.chatRoom || notification.chatRoom;
      const carId = notificationData?.carId || notification.carId;
      
      console.log('📧 Extracted from notification:', { chatRoom, carId, notificationData });
      
      if (chatRoom && carId) {
        console.log('🎯 Opening chat from notification:', { chatRoom, carId });
        
        // Extract participant IDs from chat room name (chat_carId_participant1_participant2)
        const roomParts = chatRoom.split('_');
        if (roomParts.length >= 4) {
          const notificationCarId = roomParts[1];
          const participant1 = parseInt(roomParts[2]);
          const participant2 = parseInt(roomParts[3]);
          
          // Determine the other participant (not the current user)
          const currentUserId = user?.id;
          const otherParticipantId = currentUserId === participant1 ? participant2 : participant1;
          
          console.log('🔗 Chat details:', { 
            carId: notificationCarId, 
            currentUserId, 
            otherParticipantId,
            participants: [participant1, participant2]
          });
          
          // Join the chat
          chatService.joinChat(notificationCarId, otherParticipantId);
          
          // Optional: Trigger a custom event to open chat modal
          const chatEvent = new CustomEvent('openChatFromNotification', {
            detail: {
              carId: notificationCarId,
              otherParticipantId,
              chatRoom
            }
          });
          window.dispatchEvent(chatEvent);
          
          // Close notification center
          onClose();
        } else {
          console.error('❌ Invalid chat room format:', chatRoom);
        }
      } else {
        console.error('❌ Missing chat room or car ID in notification data');
      }
    } else if (notification.type === 'booking' && notification.action_url) {
      // Handle booking notifications
      window.location.href = notification.action_url;
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, is_read: true }))
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'booking': return '📅';
      case 'message': return '💬';
      case 'new_message': return '💬';
      case 'missed_message': return '💬';
      case 'payment': return '💳';
      case 'system': return '⚙️';
      case 'welcome': return '👋';
      default: return '🔔';
    }
  };

  const getNotificationColor = (type, priority) => {
    if (priority === 'high') return 'border-red-200 bg-red-50';
    switch (type) {
      case 'booking': return 'border-blue-200 bg-blue-50';
      case 'message': return 'border-green-200 bg-green-50';
      case 'new_message': return 'border-green-200 bg-green-50';
      case 'missed_message': return 'border-green-200 bg-green-50';
      case 'payment': return 'border-yellow-200 bg-yellow-50';
      case 'system': return 'border-gray-200 bg-gray-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-16 p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-gray-900">🔔 Notifications</h2>
            {notifications.filter(n => !n.is_read).length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {notifications.filter(n => !n.is_read).length} new
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1 p-4 border-b border-gray-200 bg-gray-50">
          {[
            { key: 'all', label: 'All', icon: '📋' },
            { key: 'unread', label: 'Unread', icon: '🔔' },
            { key: 'messages', label: 'Messages', icon: '💬' },
            { key: 'bookings', label: 'Bookings', icon: '📅' },
            { key: 'system', label: 'System', icon: '⚙️' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Actions */}
        {notifications.filter(n => !n.is_read).length > 0 && (
          <div className="p-4 border-b border-gray-200 bg-blue-50">
            <button
              onClick={markAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              ✅ Mark all as read
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto max-h-96">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading notifications...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center p-8">
              <div className="text-6xl mb-4">🔕</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
              <p className="text-gray-600">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`
                    border rounded-lg p-4 transition-all cursor-pointer
                    ${getNotificationColor(notification.type, notification.priority)}
                    ${notification.is_read ? 'opacity-75' : 'shadow-sm'}
                    hover:shadow-md
                  `}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className={`text-sm font-medium ${
                            notification.is_read ? 'text-gray-700' : 'text-gray-900'
                          }`}>
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          )}
                        </div>
                        <p className={`text-sm mt-1 ${
                          notification.is_read ? 'text-gray-500' : 'text-gray-700'
                        }`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {formatTimeAgo(notification.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {!notification.is_read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                          title="Mark as read"
                        >
                          ✓
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="text-red-500 hover:text-red-700 text-xs"
                        title="Delete"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {/* Action buttons for specific notification types */}
                  {(notification.type === 'message' || notification.type === 'new_message' || notification.type === 'missed_message') && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNotificationClick(notification);
                        }}
                        className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 mr-2"
                      >
                        💬 Open Chat
                      </button>
                      {/* Parse data to show car details */}
                      {(() => {
                        let carDetails = null;
                        try {
                          const data = typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data;
                          carDetails = data?.carDetails;
                        } catch (e) {
                          carDetails = null;
                        }
                        return carDetails ? (
                          <span className="text-xs text-gray-600">
                            About: {carDetails}
                          </span>
                        ) : null;
                      })()}
                    </div>
                  )}
                  {notification.type === 'booking' && notification.action_url && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = notification.action_url;
                        }}
                        className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      >
                        View Booking
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Notifications are automatically synced across all your devices
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;