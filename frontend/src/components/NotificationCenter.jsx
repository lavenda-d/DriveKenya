import React, { useState, useEffect } from 'react';
import { notificationService } from '../services/notificationService.js';
import { chatService } from '../services/chatService.js';
import { Bell, MessageSquare, Calendar, CreditCard, Settings, X, Check, Trash2, Info, AlertTriangle } from 'lucide-react';

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
      if (isOpen) {
        loadNotifications();
      }
    });

    const unsubscribeChatNotifications = chatService.onNotification((notification) => {
      console.log('🔔 NotificationCenter received chat notification:', notification);
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
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    if (notification.type === 'message' || notification.type === 'new_message' || notification.type === 'missed_message') {
      let notificationData = notification.data;
      if (typeof notificationData === 'string') {
        try {
          notificationData = JSON.parse(notificationData);
        } catch (e) {
          notificationData = {};
        }
      }

      const chatRoom = notificationData?.chatRoom || notification.chatRoom;
      const carId = notificationData?.carId || notification.carId;

      if (chatRoom && carId) {
        const roomParts = chatRoom.split('_');
        if (roomParts.length >= 4) {
          const notificationCarId = roomParts[1];
          const participant1 = parseInt(roomParts[2]);
          const participant2 = parseInt(roomParts[3]);
          const currentUserId = user?.id;
          const otherParticipantId = currentUserId === participant1 ? participant2 : participant1;

          chatService.joinChat(notificationCarId, otherParticipantId);

          const chatEvent = new CustomEvent('openChatFromNotification', {
            detail: { carId: notificationCarId, otherParticipantId, chatRoom }
          });
          window.dispatchEvent(chatEvent);
          onClose();
        }
      }
    } else if (notification.type === 'booking' && notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
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
      case 'booking': return <Calendar size={20} className="text-blue-400" />;
      case 'message':
      case 'new_message':
      case 'missed_message': return <MessageSquare size={20} className="text-emerald-400" />;
      case 'payment': return <CreditCard size={20} className="text-yellow-400" />;
      case 'system': return <Settings size={20} className="text-purple-400" />;
      case 'welcome': return <Info size={20} className="text-cyan-400" />;
      default: return <Bell size={20} className="text-white/60" />;
    }
  };

  const getNotificationStyles = (type, priority, isRead) => {
    let baseStyles = "relative border rounded-2xl p-4 transition-all duration-300 group overflow-hidden ";

    if (isRead) {
      baseStyles += "bg-white/5 border-white/5 opacity-60 ";
    } else {
      baseStyles += "bg-white/10 border-white/10 shadow-lg hover:bg-white/20 ";
    }

    if (priority === 'high') baseStyles += "border-red-500/30 ";

    return baseStyles;
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-start justify-center pt-24 p-4 z-[9999] font-sans">
      <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden relative">
        {/* Animated Background Decoration */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-white/10 relative z-10">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
              <Bell className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Notifications</h2>
              {notifications.filter(n => !n.is_read).length > 0 && (
                <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mt-1">
                  {notifications.filter(n => !n.is_read).length} Unread Updates
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white bg-white/5 hover:bg-white/10 p-2.5 rounded-full transition-all group"
          >
            <X size={24} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center p-4 bg-black/20 overflow-x-auto hide-scrollbar relative z-10 border-b border-white/5 gap-2">
          {[
            { key: 'all', label: 'All', icon: <Bell size={14} /> },
            { key: 'unread', label: 'Unread', icon: <Check size={14} /> },
            { key: 'messages', label: 'Chats', icon: <MessageSquare size={14} /> },
            { key: 'bookings', label: 'Rentals', icon: <Calendar size={14} /> },
            { key: 'system', label: 'System', icon: <Settings size={14} /> }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center space-x-2 px-6 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${filter === tab.key
                  ? 'bg-white text-slate-900 shadow-xl'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
            >
              {tab.icon}
              <span>{tab.label.toUpperCase()}</span>
            </button>
          ))}
        </div>

        {/* Quick Actions */}
        {notifications.filter(n => !n.is_read).length > 0 && (
          <div className="p-4 bg-blue-600/10 border-b border-blue-500/20 relative z-10 flex justify-between items-center">
            <p className="text-xs text-blue-300/80 font-medium italic">You have unread news...</p>
            <button
              onClick={markAllAsRead}
              className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 transition-all active:scale-95"
            >
              <Check size={12} className="mr-1.5" /> Mark Archive as Read
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 relative z-10 bg-black/10">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white/30"></div>
              <span className="text-white/40 text-sm font-medium">Syncing updates...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <div className="bg-white/5 p-6 rounded-full mb-6 border border-white/5">
                <Bell size={48} className="text-white/20" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Zero distractions</h3>
              <p className="text-white/40 text-sm max-w-[250px]">You've handled all your notifications. Great job!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={getNotificationStyles(notification.type, notification.priority, notification.is_read)}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {/* Status Indicator */}
                  {!notification.is_read && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                  )}

                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`text-sm font-bold truncate ${notification.is_read ? 'text-white/60' : 'text-white'}`}>
                            {notification.title}
                          </h4>
                          <span className="text-[10px] font-bold text-white/30 shrink-0 ml-2">
                            {formatTimeAgo(notification.created_at)}
                          </span>
                        </div>
                        <p className={`text-sm leading-relaxed ${notification.is_read ? 'text-white/40' : 'text-white/70'}`}>
                          {notification.message}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4 self-center md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      {!notification.is_read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="p-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 rounded-lg transition-all"
                          title="Mark as Read"
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/30 rounded-lg transition-all"
                        title="Dismiss"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Actions Area */}
                  {!notification.is_read && (
                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center space-x-3">
                      {(notification.type === 'message' || notification.type === 'new_message' || notification.type === 'missed_message') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNotificationClick(notification);
                          }}
                          className="text-[11px] font-black uppercase tracking-wider bg-emerald-500 text-slate-900 px-4 py-1.5 rounded-lg hover:bg-emerald-400 transition-all flex items-center"
                        >
                          <MessageSquare size={12} className="mr-2" /> Resume Chat
                        </button>
                      )}
                      {notification.type === 'booking' && notification.action_url && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = notification.action_url;
                          }}
                          className="text-[11px] font-black uppercase tracking-wider bg-blue-500 text-white px-4 py-1.5 rounded-lg hover:bg-blue-400 transition-all flex items-center"
                        >
                          <Calendar size={12} className="mr-2" /> Inspect details
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-black/30 relative z-10">
          <p className="text-[10px] text-white/30 text-center font-bold uppercase tracking-[0.2em]">
            Cloud Synced • Live Updates Enabled
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;