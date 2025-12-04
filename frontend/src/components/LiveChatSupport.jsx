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
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [agent, setAgent] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('book') || lowerMessage.includes('rent')) {
      return 'To book a car, browse our Cars page, select your dates, and click "Book Now". Need help with a specific car?';
    } else if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
      return 'Our prices range from KES 2,000 - 15,000 per day depending on the vehicle. Use our Pricing Calculator for exact quotes!';
    } else if (lowerMessage.includes('payment')) {
      return 'We accept M-Pesa, Visa, Mastercard, and bank transfers. All payments are secure. Which method would you prefer?';
    } else if (lowerMessage.includes('cancel')) {
      return 'You can cancel bookings from My Bookings page. Free cancellation up to 24 hours before pickup!';
    } else if (lowerMessage.includes('location')) {
      return 'We offer pickup/delivery across Nairobi. Where would you like your car delivered?';
    } else {
      return 'Thank you for your message! A support agent will assist you shortly. You can also check our FAQ section.';
    }
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

  const requestVideoCall = () => {
    if (socket) {
      socket.emit('request-video-call');
    }
  };

  const createTicket = () => {
    // Navigate to ticket creation
    onClose();
    // Implement ticket creation navigation
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
              <div className="text-xs text-white/80">
                {isConnected ? (
                  agent ? `Chat with ${agent.name}` : 'Usually replies instantly'
                ) : 'Usually replies instantly'}
              </div>
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

        {/* Connection Status */}
        {!isConnected && (
          <div className="bg-yellow-50 border-b border-yellow-200 p-3">
            <div className="text-sm text-yellow-800">
              Connecting to support agent...
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
                onClick={requestVideoCall}
                className="flex items-center space-x-1 px-3 py-1 text-sm bg-green-100 text-green-700 rounded-full hover:bg-green-200"
              >
                <Video size={14} />
                <span>Video Call</span>
              </button>
              
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