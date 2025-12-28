import { useState, useEffect, useRef } from 'react';
import { chatService } from '../services/chatService.js';

const ChatModal = ({ isOpen, onClose, car, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [chatRoom, setChatRoom] = useState('');
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize chat when modal opens
  useEffect(() => {
    if (isOpen && car && currentUser) {
      console.log('🚀 Initializing role-aware chat for car:', car.name);
      console.log('👤 Current user:', currentUser.name, '| Role:', currentUser.role, '| ID:', currentUser.id);
      console.log('🚗 Car owner ID:', car.host_id);

      const carOwnerId = car.host_id;
      const currentUserId = currentUser.id;
      const currentUserRole = currentUser.role;
      const isCurrentUserOwner = currentUserId === carOwnerId;

      let otherParticipantId;
      let chatContext = '';

      if (isCurrentUserOwner && currentUserRole === 'host') {
        // Car owner opening chat - they need to see conversation with interested customers
        // Use the customer ID passed through the car object, or show a customer selection interface
        otherParticipantId = car.customerId || null;
        chatContext = 'owner-to-customer';

        if (!otherParticipantId) {
          console.log('⚠️ No specific customer selected for car owner chat');
          setError('Please select a customer to chat with');
          return;
        }

        console.log(`🏠 Car Owner initiated chat with customer ${otherParticipantId} about their car`);
      } else if (!isCurrentUserOwner && currentUserRole === 'customer') {
        // Customer opening chat with car owner
        otherParticipantId = carOwnerId;
        chatContext = 'customer-to-owner';
        console.log('🚗 Customer initiated chat with car owner about renting');
      } else if (isCurrentUserOwner && currentUserRole === 'customer') {
        // Customer viewing their own car (they're both owner and customer)
        // This shouldn't happen in normal flow, but handle gracefully
        console.warn('⚠️ Customer trying to chat about their own car - redirecting');
        return;
      } else {
        // Fallback for any other scenario
        otherParticipantId = carOwnerId;
        chatContext = 'general';
        console.log('🔄 General chat initiated');
      }

      // Always use consistent participant order: smaller ID first, then larger ID
      const participant1 = Math.min(currentUserId, otherParticipantId);
      const participant2 = Math.max(currentUserId, otherParticipantId);

      const roomId = `chat_${car.id}_${participant1}_${participant2}`;
      setChatRoom(roomId);

      console.log('🎯 Generated chat room:', roomId);
      console.log('💬 Chat context:', chatContext);
      console.log('👥 Participants:', participant1, 'and', participant2);

      console.log('🎯 Generated chat room:', roomId, 'for participants:', participant1, 'and', participant2);

      // Connect to chat service
      chatService.connect();

      // Set up connection listener to join chat once connected
      const unsubscribeConnection = chatService.onConnection((connected) => {
        if (connected) {
          console.log('🔗 Connection established, joining chat room...');
          console.log('🏠 Joining chat with carId:', car.id, 'participant1:', participant1, 'participant2:', participant2);

          // Use the other participant ID (not current user)
          const chatParticipantId = currentUserId === participant1 ? participant2 : participant1;
          chatService.joinChat(car.id, chatParticipantId);

          // Mark messages as read when opening chat
          if (roomId) {
            chatService.markMessagesAsRead(roomId);
            console.log('📖 Marked messages as read for room:', roomId);
          }
        }
        setIsConnected(connected);
      });

      // Set up event listeners
      const unsubscribeMessage = chatService.onMessage((data, type) => {
        if (type === 'history') {
          setMessages(data.messages || []);
        } else {
          setMessages(prev => [...prev, data]);
        }
      });

      const unsubscribeTyping = chatService.onTyping((data) => {
        if (data.userId !== currentUser.id) {
          setTypingUsers(prev => {
            if (data.isTyping) {
              return [...prev.filter(u => u.userId !== data.userId), data];
            } else {
              return prev.filter(u => u.userId !== data.userId);
            }
          });
        }
      });

      const unsubscribeConnectionStatus = chatService.onConnection((connected) => {
        setIsConnected(connected);
      });

      // Cleanup on unmount
      return () => {
        unsubscribeMessage();
        unsubscribeTyping();
        unsubscribeConnection();
        unsubscribeConnectionStatus();
      };
    }
  }, [isOpen, car, currentUser]);

  // Handle sending messages
  const handleSendMessage = (e) => {
    e.preventDefault();
    console.log('🚀 Attempting to send message:', newMessage);
    console.log('🏠 Current chat room:', chatRoom);
    console.log('🔗 Is connected:', isConnected);

    if (!newMessage.trim()) {
      console.warn('❌ Empty message');
      return;
    }

    if (!chatRoom) {
      console.warn('❌ No chat room set');
      return;
    }

    chatService.sendMessage(newMessage.trim(), chatRoom);
    setNewMessage('');
    chatService.stopTyping();
  };

  // Handle typing indicators
  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (!isTyping) {
      setIsTyping(true);
      chatService.startTyping();
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      chatService.stopTyping();
    }, 1000);
  };

  // Format timestamp with live updates
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 30000) return 'Just now'; // Less than 30 seconds
    if (diffMins < 1) return 'Less than a minute ago';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Add a state to force re-render timestamps every minute
  const [, setTimeUpdate] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeUpdate(prev => prev + 1);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg h-[600px] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-muted/20">
          <div>
            <h3 className="text-xl font-bold text-foreground">
              {currentUser?.role === 'host' && currentUser?.id === car?.host_id
                ? `💬 Customer Inquiries: ${car?.name}`
                : `💬 Chat about ${car?.name}`
              }
            </h3>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-destructive'}`}></span>
              <span>{isConnected ? 'Connected' : 'Connecting...'}</span>
              {currentUser?.role === 'host' && currentUser?.id === car?.host_id ? (
                <span className="ml-4">🔑 As Car Owner</span>
              ) : currentUser?.role === 'customer' ? (
                <span className="ml-4">🚗 As Customer • Owner: {car?.owner_name}</span>
              ) : (
                car?.owner_name && <span className="ml-4">• Owner: {car.owner_name}</span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-2xl font-bold transition-colors"
          >
            ×
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <div className="text-4xl mb-4">💬</div>
              <p>Start a conversation about this car!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.sender_id === currentUser.id;
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${isOwnMessage
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                      }`}
                  >
                    {!isOwnMessage && (
                      <div className="text-xs text-muted-foreground mb-1">
                        {message.first_name} {message.last_name}
                      </div>
                    )}
                    <p className="text-sm">{message.message}</p>
                    <div className={`text-xs mt-1 ${isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {formatTimestamp(message.created_at)}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="flex justify-start">
              <div className="bg-white/20 text-white px-4 py-2 rounded-2xl">
                <div className="flex items-center space-x-1">
                  <span className="text-xs">{typingUsers[0].userName} is typing</span>
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-white rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Message input */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-muted/20">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={handleTyping}
              placeholder={
                currentUser?.role === 'host' && currentUser?.id === car?.host_id
                  ? "Reply to customer inquiry..."
                  : currentUser?.role === 'customer'
                    ? "Ask about availability, pricing, etc..."
                    : "Type your message..."
              }
              className="flex-1 px-4 py-3 bg-input/50 border border-input rounded-full text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={!isConnected}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || !isConnected}
              className="bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground px-6 py-3 rounded-full font-semibold transition-all"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatModal;