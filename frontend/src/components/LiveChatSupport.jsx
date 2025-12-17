import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Send, Phone, Video, Paperclip, Smile, Clock, CheckCheck, X, Minimize2 } from 'lucide-react';
import io from 'socket.io-client';

const LiveChatSupport = ({ isOpen: isOpenProp, onClose: onCloseProp, standalone = true }) => {
  const { t } = useTranslation();
  
  // Use internal state for standalone mode, or props for controlled mode
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = standalone ? internalOpen : (isOpenProp ?? false);
  const handleClose = standalone ? () => setInternalOpen(false) : (onCloseProp || (() => {}));
  
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'Hello! How can I help you today?',
      sender: 'agent',
      timestamp: new Date()
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [agent, setAgent] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketData, setTicketData] = useState({ subject: '', description: '', category: 'general', priority: 'medium' });
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      initializeChat();
    } else {
      disconnectChat();
    }

    return () => disconnectChat();
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = () => {
    // Use import.meta.env for Vite or fallback to localhost
    const socketUrl = import.meta.env?.VITE_WEBSOCKET_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl);
    setSocket(newSocket);

    newSocket.emit('join-support-chat', {
      userId: localStorage.getItem('userId'),
      userType: 'customer'
    });

    newSocket.on('connected', (data) => {
      setIsConnected(true);
      setAgent(data.agent);
      setMessages(data.chatHistory || []);
    });

    newSocket.on('message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('agent-typing', () => {
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 3000);
    });

    newSocket.on('agent-assigned', (agentData) => {
      setAgent(agentData);
      setMessages(prev => [...prev, {
        type: 'system',
        message: `${agentData.name} has joined the chat`,
        timestamp: new Date().toISOString()
      }]);
    });
  };

  const disconnectChat = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    const userMessage = {
      text: newMessage,
      sender: 'user',
      timestamp: new Date(),
      id: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setShowEmojiPicker(false);

    // Simple auto-reply
    setTimeout(() => {
      const reply = getAutoReply(newMessage);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: reply,
        sender: 'agent',
        timestamp: new Date()
      }]);
    }, 1000);
  };

  const getAutoReply = (message) => {
    const m = message.toLowerCase();

    if (m.includes('book') || m.includes('rent')) {
      return 'To book a car: open Cars, choose dates, and tap “Book Now”. Need help with a specific car?';
    }
    if (m.includes('price') || m.includes('cost') || m.includes('quote')) {
      return 'Prices vary by model and dates. Use the Pricing Calculator for an exact quote. Typical range: KES 2,000–15,000 per day.';
    }
    if (m.includes('payment') || m.includes('mpesa') || m.includes('visa') || m.includes('mastercard')) {
      return 'We accept M-Pesa, Visa/Mastercard, and bank transfer. All payments are secure. Which method suits you?';
    }
    if (m.includes('cancel') || m.includes('refund')) {
      return 'You can cancel in My Bookings. Free cancellation up to 24 hours before pickup. Refunds follow your payment method.';
    }
    if (m.includes('location') || m.includes('pickup') || m.includes('delivery')) {
      return 'Pickup/delivery is available across Nairobi. Share your preferred pickup spot and time.';
    }
    if (m.includes('account') || m.includes('profile') || m.includes('photo')) {
      return 'Update your profile and photo under Profile & Settings. Changes apply instantly.';
    }
    if (m.includes('verify') || m.includes('documents') || m.includes('id')) {
      return 'Submit verification documents under Profile & Settings → Verification. Status updates appear as soon as we review.';
    }
    if (m.includes('available') || m.includes('availability') || m.includes('calendar')) {
      return 'Availability appears on each car’s calendar. Owners can mark Available, Booked, or Maintenance from Manage Car.';
    }
    if (m.includes('message') || m.includes('chat') || m.includes('support')) {
      return 'This is automated support with instant replies. For live help, use View Messages on the car or Contact Support.';
    }
    if (m.includes('help') || m.includes('faq')) {
      return 'Common topics: booking, pricing, payment, cancellations, verification, availability. Ask anything — we’ll guide you!';
    }
    return 'Thanks! This support is automated and does not require a live connection. Ask about booking, pricing, payments, cancellations, verification, or availability.';
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const fileMessage = {
        text: `📎 Sent file: ${file.name}`,
        sender: 'user',
        timestamp: new Date(),
        id: Date.now()
      };
      setMessages(prev => [...prev, fileMessage]);
      
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          text: 'Thank you for sending the file. Our support team will review it shortly.',
          sender: 'agent',
          timestamp: new Date()
        }]);
      }, 1000);
    }
  };

  const addEmoji = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Video call feature removed

  const createTicket = () => {
    setShowTicketForm(true);
  };

  const submitTicket = async () => {
    if (!ticketData.subject || !ticketData.description) {
      alert('Please fill in both subject and description');
      return;
    }

    // Get token
    const token = localStorage.getItem('driveKenya_token');

    try {
      const response = await fetch('http://localhost:5000/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(ticketData)
      });

      const data = await response.json();
      
      if (response.status === 401) {
        // Token is invalid or expired - need to log in
        const errorMessage = {
          text: '❌ Your session has expired. Please refresh the page and log in again.',
          sender: 'agent',
          timestamp: new Date(),
          id: Date.now()
        };
        setMessages(prev => [...prev, errorMessage]);
        setShowTicketForm(false);
        // Suggest page refresh
        setTimeout(() => {
          if (confirm('Your session has expired. Would you like to refresh the page?')) {
            window.location.reload();
          }
        }, 1000);
        return;
      }
      
      if (response.status === 403) {
        // Token invalid - suggest logout/login
        const errorMessage = {
          text: '❌ Authentication failed. Please sign out and sign in again to refresh your session.',
          sender: 'agent',
          timestamp: new Date(),
          id: Date.now()
        };
        setMessages(prev => [...prev, errorMessage]);
        setShowTicketForm(false);
        return;
      }
      
      if (data.success) {
        const confirmMessage = {
          text: `✅ Support ticket #${data.ticketId} created successfully! We'll respond within 24 hours. Check your email for updates.`,
          sender: 'agent',
          timestamp: new Date(),
          id: Date.now()
        };
        setMessages(prev => [...prev, confirmMessage]);
        setShowTicketForm(false);
        setTicketData({ subject: '', description: '', category: 'general', priority: 'medium' });
      } else {
        throw new Error(data.message || 'Failed to create ticket');
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      const errorMessage = {
        text: `❌ Failed to create support ticket: ${error.message}. Please try again or contact us at support@drivekenya.com`,
        sender: 'agent',
        timestamp: new Date(),
        id: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
      setShowTicketForm(false);
    }
  };

  if (!isOpen && !standalone) return null;
  
  // Standalone floating button
  if (standalone && !isOpen) {
    return (
      <button
        onClick={() => setInternalOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 transform hover:scale-110 z-[100] animate-bounce"
        title="Chat with us"
        style={{ zIndex: 100 }}
      >
        <MessageSquare className="h-6 w-6" />
        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
          !
        </div>
      </button>
    );
  }

  return (
    <div className={`fixed ${standalone ? 'bottom-20 right-6 top-20' : 'inset-0'} z-50 flex items-end justify-end ${standalone ? '' : 'p-4'}`}>
      <div className="w-96 max-h-[calc(100vh-120px)] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
                <MessageSquare size={20} />
              </div>
              <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-400 rounded-full border-2 border-white"></div>
            </div>
            <div>
              <h3 className="font-semibold">DriveKenya Support</h3>
              <div className="text-xs text-white/80">Automated Support • Instant helpful replies</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {standalone && (
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="hover:bg-white/20 p-1.5 rounded transition-colors"
                title="Minimize"
              >
                <Minimize2 size={18} />
              </button>
            )}
            <button
              onClick={handleClose}
              className="hover:bg-white/20 p-1.5 rounded transition-colors"
              title="Close chat"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Ticket Form Modal */}
        {showTicketForm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 rounded-lg">
            <div className="bg-white rounded-lg p-6 w-80 max-w-full m-4 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Support Ticket</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={ticketData.subject}
                    onChange={(e) => setTicketData({...ticketData, subject: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="Brief summary of your issue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={ticketData.description}
                    onChange={(e) => setTicketData({...ticketData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 min-h-[100px]"
                    placeholder="Describe your issue in detail..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={ticketData.category}
                    onChange={(e) => setTicketData({...ticketData, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="general">General</option>
                    <option value="booking">Booking Issue</option>
                    <option value="payment">Payment</option>
                    <option value="technical">Technical</option>
                    <option value="account">Account</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={ticketData.priority}
                    onChange={(e) => setTicketData({...ticketData, priority: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={submitTicket}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Submit Ticket
                  </button>
                  <button
                    onClick={() => setShowTicketForm(false)}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <MessageSquare className="mx-auto mb-4 text-gray-300" size={48} />
              <p>Welcome to DriveKenya Support</p>
              <p className="text-sm">How can we help you today?</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={index} className={`flex ${
                message.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}>
                {message.type === 'system' ? (
                  <div className="text-center text-sm text-gray-500 italic">
                    {message.message}
                  </div>
                ) : (
                  <div className={`max-w-xs px-3 py-2 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <div className="text-sm">{message.text}</div>
                    <div className={`text-xs mt-1 flex items-center ${
                      message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      <Clock size={10} className="mr-1" />
                      {new Date(message.timestamp).toLocaleTimeString()}
                      {message.sender === 'user' && (
                        <CheckCheck size={10} className="ml-1" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 px-3 py-2 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {isConnected && (
          <div className="border-t border-gray-200 p-2">
            <div className="flex justify-center space-x-2">
              <button
                onClick={createTicket}
                className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200"
              >
                <MessageSquare size={14} />
                <span>Create Ticket</span>
              </button>
            </div>
          </div>
        )}

        {/* Message Input */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={t('support.typeMessage')}
                className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
              />
              
              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div className="absolute bottom-12 right-0 bg-white border border-gray-300 rounded-lg shadow-lg p-2 grid grid-cols-8 gap-1 z-50">
                  {['😊', '👍', '❤️', '🎉', '🚗', '✅', '👋', '🙏', '😃', '😄', '😁', '🤝', '💯', '🔥', '⭐', '✨'].map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => addEmoji(emoji)}
                      className="text-2xl hover:bg-gray-100 rounded p-1"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
              
              <div className="absolute right-2 top-2 flex space-x-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-gray-400 hover:text-gray-600"
                  title="Attach file"
                >
                  <Paperclip size={16} />
                </button>
                <button 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="text-gray-400 hover:text-gray-600"
                  title="Add emoji"
                >
                  <Smile size={16} />
                </button>
              </div>
            </div>
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Support button component
export const SupportButton = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 flex items-center justify-center z-40"
      >
        <MessageSquare size={24} />
      </button>

      <LiveChatSupport 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
      />
    </>
  );
};

export default LiveChatSupport;