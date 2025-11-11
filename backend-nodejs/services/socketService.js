import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { query } from '../config/database-sqlite.js';

let io;

// Initialize Socket.IO server
export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:3000', 
        'http://localhost:3001',
        process.env.FRONTEND_URL
      ].filter(Boolean),
      credentials: true,
    }
  });

  // Middleware for socket authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user details from database
      const userResult = query('SELECT id, first_name, last_name, email, role FROM users WHERE id = ?', [decoded.userId]);
      
      if (userResult.rows.length === 0) {
        return next(new Error('User not found'));
      }

      socket.user = userResult.rows[0];
      console.log(`🔐 Socket authenticated: ${socket.user.first_name} ${socket.user.last_name} (Role: ${socket.user.role})`);
      next();
    } catch (err) {
      // Reduce spam by only logging JWT signature errors once per minute
      const now = Date.now();
      if (!global.lastJWTError || (now - global.lastJWTError) > 60000) {
        console.error('Socket authentication error:', err.name === 'JsonWebTokenError' ? 'JWT signature invalid - clear browser storage' : err.message);
        global.lastJWTError = now;
      }
      next(new Error('Authentication error'));
    }
  });

  // Handle socket connections
  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.user.first_name} ${socket.user.last_name}`);

    // Join user to their personal room
    socket.join(`user_${socket.user.id}`);
    
    // Send any pending notifications for this user
    loadPendingNotifications(socket);

    // Handle joining a chat room (for car booking discussions)
    socket.on('join_chat', async (data) => {
      try {
        console.log(`🎯 RECEIVED join_chat event with data:`, data);
        const { carId, ownerId } = data;
        const userId = socket.user.id;
        const userRole = socket.user.role; // Get user role from socket
        
        console.log(`🚗 Join chat request: Car ${carId}, Other User ${ownerId}, Current User ${userId} (Role: ${userRole})`);
        
        // Verify car exists
        const carResult = query('SELECT * FROM cars WHERE id = ?', [carId]);
        
        if (carResult.rows.length === 0) {
          socket.emit('error', { message: 'Car not found' });
          return;
        }
        
        const car = carResult.rows[0];
        const isCarOwner = car.host_id === userId;
        
        // Determine the correct participants for the chat room
        let customerId, carOwnerId;
        let chatContext = '';
        
        if (isCarOwner) {
          // Current user is the car owner, ownerId is actually the customer
          carOwnerId = userId;
          customerId = ownerId;
          chatContext = 'owner-managing-inquiries';
          console.log(`🏠 Car Owner (ID: ${userId}) joining chat with customer (ID: ${customerId})`);
        } else {
          // Current user is a customer, ownerId should be the car owner
          customerId = userId;
          carOwnerId = car.host_id; // Always use car's actual owner
          chatContext = 'customer-inquiring';
          console.log(`🚗 Customer (ID: ${userId}) joining chat with car owner (ID: ${carOwnerId})`);
        }
        
        // Generate consistent room name using min/max to match frontend logic
        const minId = Math.min(customerId, carOwnerId);
        const maxId = Math.max(customerId, carOwnerId);
        const chatRoom = `chat_${carId}_${minId}_${maxId}`;
        
        // Leave any previous chat room
        if (socket.currentChatRoom) {
          socket.leave(socket.currentChatRoom);
        }
        
        socket.join(chatRoom);
        socket.currentChatRoom = chatRoom;
        socket.chatContext = chatContext;
        
        console.log(`📱 User ${socket.user.first_name} joined chat room: ${chatRoom}`);
        console.log(`📋 Chat context: ${chatContext}`);
        console.log(`🔍 Room participants: Customer ${customerId} and Car Owner ${carOwnerId}`);
        console.log(`🔗 Socket.currentChatRoom set to: ${socket.currentChatRoom}`);
        
        // Load and send recent chat history
        const messagesResult = query(`
          SELECT m.*, u.first_name, u.last_name 
          FROM chat_messages m
          JOIN users u ON m.sender_id = u.id
          WHERE m.chat_room = ?
          ORDER BY m.created_at DESC
          LIMIT 50
        `, [chatRoom]);
        
        socket.emit('chat_history', {
          messages: messagesResult.rows.reverse(),
          room: chatRoom
        });
        
        // Mark all messages in this chat room as read for the current user
        query(`
          UPDATE chat_messages 
          SET is_read = 1 
          WHERE chat_room = ? AND sender_id != ?
        `, [chatRoom, userId]);
        
        console.log(`📖 Marked messages as read for user ${userId} in room ${chatRoom}`);
        
        // Emit success event to confirm chat joined
        socket.emit('chat_joined', {
          success: true,
          room: chatRoom,
          message: 'Successfully joined chat room'
        });

      } catch (error) {
        console.error('Join chat error:', error);
        socket.emit('error', { message: 'Failed to join chat' });
      }
    });

    // Handle sending messages
    socket.on('send_message', async (data) => {
      try {
        const { message, chatRoom } = data;
        const senderId = socket.user.id;
        
        console.log(`🔍 Send message debug:`);
        console.log(`   - User ID: ${senderId}`);
        console.log(`   - Socket current room: ${socket.currentChatRoom}`);
        console.log(`   - Requested chat room: ${chatRoom}`);
        console.log(`   - Message: ${message}`);
        
        if (!socket.currentChatRoom || socket.currentChatRoom !== chatRoom) {
          console.log(`❌ Authorization failed for chat room`);
          console.log(`   - Has current room: ${!!socket.currentChatRoom}`);
          console.log(`   - Room match: ${socket.currentChatRoom === chatRoom}`);
          socket.emit('error', { message: 'Not authorized for this chat room' });
          return;
        }

        // Save message to database with EAT timezone (unread by default)
        const messageResult = query(`
          INSERT INTO chat_messages (chat_room, sender_id, message, is_read, created_at)
          VALUES (?, ?, ?, 0, datetime('now', '+3 hours'))
        `, [chatRoom, senderId, message]);

        // Get the EAT timestamp for consistency
        const eatTimestamp = new Date(new Date().getTime() + (3 * 60 * 60 * 1000)).toISOString();

        const messageData = {
          id: messageResult.insertId,
          chat_room: chatRoom,
          sender_id: senderId,
          message: message,
          first_name: socket.user.first_name,
          last_name: socket.user.last_name,
          is_read: 0,
          created_at: eatTimestamp
        };

        // Extract car ID and participant IDs from chat room name
        const roomParts = chatRoom.split('_'); // chat_1_9_10 -> ['chat', '1', '9', '10']
        const carId = roomParts[1];
        const participant1 = parseInt(roomParts[2]);
        const participant2 = parseInt(roomParts[3]);
        
        // Determine the recipient (the other participant in the chat)
        const recipientId = senderId === participant1 ? participant2 : participant1;
        
        console.log(`🎯 Targeted notification: Car ${carId}, Sender ${senderId}, Recipient ${recipientId}`);
        
        // Update notification counts for the specific recipient only with EAT timestamp
        query(`
          INSERT OR REPLACE INTO chat_notifications (user_id, chat_room, unread_count, last_message_id, last_updated)
          VALUES (
            ?, 
            ?, 
            COALESCE((SELECT unread_count FROM chat_notifications WHERE user_id = ? AND chat_room = ?), 0) + 1,
            ?,
            datetime('now', '+3 hours')
          )
        `, [recipientId, chatRoom, recipientId, chatRoom, messageResult.insertId]);

        // Send notification only to the specific recipient if they're online
        const recipientSocket = Array.from(io.sockets.sockets.values()).find(
          s => s.user && s.user.id === recipientId
        );
        
        let notificationsSent = 0;
        if (recipientSocket) {
          // Get recipient details for context
          const recipientResult = query('SELECT first_name, last_name, role FROM users WHERE id = ?', [recipientId]);
          const recipient = recipientResult.rows[0];
          
          // Get car details for context
          const carResult = query('SELECT make, model FROM cars WHERE id = ?', [carId]);
          const car = carResult.rows[0];
          
          const senderRole = socket.user.role;
          const recipientRole = recipient.role;
          
          // Create specific notification message with car context
          let notificationTitle = `${socket.user.first_name} ${socket.user.last_name}`;
          let contextMessage = message;
          
          if (senderRole === 'host' && recipientRole === 'customer') {
            notificationTitle = `🔑 Car Owner: ${socket.user.first_name}`;
            contextMessage = `About ${car.make} ${car.model}: ${message}`;
          } else if (senderRole === 'customer' && recipientRole === 'host') {
            notificationTitle = `🚗 Customer: ${socket.user.first_name}`;
            contextMessage = `About ${car.make} ${car.model}: ${message}`;
          }
          
          recipientSocket.emit('new_notification', {
            type: 'new_message',
            chatRoom: chatRoom,
            carId: carId,
            carDetails: `${car.make} ${car.model}`,
            senderName: notificationTitle,
            senderRole: senderRole,
            recipientRole: recipientRole,
            message: contextMessage,
            messageId: messageResult.insertId,
            chatContext: socket.chatContext || 'general'
          });
          
          notificationsSent = 1;
          console.log(`📤 Targeted notification sent to ${recipient.first_name} about ${car.make} ${car.model}`);
        } else {
          console.log(`📱 Recipient ${recipientId} is offline - notification saved to database`);
        }

        // Store notification in database for persistence (for both online and offline users)
        try {
          // Get recipient and car details for database storage
          const recipientResult = query('SELECT first_name, last_name, role FROM users WHERE id = ?', [recipientId]);
          const recipient = recipientResult.rows[0];
          
          const carResult = query('SELECT make, model FROM cars WHERE id = ?', [carId]);
          const car = carResult.rows[0];
          
          if (recipient && car) {
            const senderRole = socket.user.role;
            const recipientRole = recipient.role;
            
            // Create notification title and message
            let notificationTitle = `New message from ${socket.user.first_name} ${socket.user.last_name}`;
            let contextMessage = message;
            
            if (senderRole === 'host' && recipientRole === 'customer') {
              notificationTitle = `🔑 New message from Car Owner: ${socket.user.first_name}`;
              contextMessage = `About ${car.make} ${car.model}: ${message}`;
            } else if (senderRole === 'customer' && recipientRole === 'host') {
              notificationTitle = `🚗 New message from Customer: ${socket.user.first_name}`;
              contextMessage = `About ${car.make} ${car.model}: ${message}`;
            }

            // Store in notifications table
            const notificationData = JSON.stringify({
              chatRoom: chatRoom,
              carId: carId,
              carDetails: `${car.make} ${car.model}`,
              senderName: `${socket.user.first_name} ${socket.user.last_name}`,
              senderRole: senderRole,
              recipientRole: recipientRole,
              messageId: messageResult.insertId,
              chatContext: socket.chatContext || 'general'
            });

            query(`
              INSERT INTO notifications (user_id, type, title, message, data, is_read, created_at)
              VALUES (?, ?, ?, ?, ?, 0, datetime('now', '+3 hours'))
            `, [recipientId, 'message', notificationTitle, contextMessage, notificationData]);

            console.log(`💾 Chat notification stored in database for user ${recipientId}`);
          }
        } catch (dbError) {
          console.error('Error storing notification in database:', dbError);
        }

        // Send message to all users in the chat room
        io.to(chatRoom).emit('new_message', messageData);
        
        console.log(`💬 Message sent in ${chatRoom}: ${message}`);
        console.log(`🔔 Notifications sent to ${notificationsSent} other participants`);
        
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      if (socket.currentChatRoom) {
        socket.to(socket.currentChatRoom).emit('user_typing', {
          userId: socket.user.id,
          userName: `${socket.user.first_name} ${socket.user.last_name}`,
          isTyping: true
        });
      }
    });

    socket.on('typing_stop', (data) => {
      if (socket.currentChatRoom) {
        socket.to(socket.currentChatRoom).emit('user_typing', {
          userId: socket.user.id,
          userName: `${socket.user.first_name} ${socket.user.last_name}`,
          isTyping: false
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.user.first_name} ${socket.user.last_name}`);
    });

    // Handle marking messages as read
    socket.on('mark_messages_read', async (data) => {
      try {
        const { chatRoom } = data;
        const userId = socket.user.id;

        // Mark all messages in this chat room as read for this user
        query(`
          UPDATE chat_messages 
          SET is_read = 1 
          WHERE chat_room = ? AND sender_id != ?
        `, [chatRoom, userId]);

        // Reset notification count for this chat room with EAT timestamp
        query(`
          UPDATE chat_notifications 
          SET unread_count = 0, last_updated = datetime('now', '+3 hours')
          WHERE user_id = ? AND chat_room = ?
        `, [userId, chatRoom]);

        console.log(`📖 Marked messages as read for user ${userId} in room ${chatRoom}`);

      } catch (error) {
        console.error('Mark messages read error:', error);
      }
    });
  });

  return io;
};

// Notification helper functions
export const emitBookingNotification = (userId, bookingData, action) => {
  if (io) {
    const title = `Booking ${action}`;
    let message = '';
    
    switch (action) {
      case 'created':
        message = `New booking for ${bookingData.carName || 'vehicle'} created successfully`;
        break;
      case 'confirmed':
        message = `Your booking for ${bookingData.carName || 'vehicle'} has been confirmed`;
        break;
      case 'cancelled':
        message = `Booking for ${bookingData.carName || 'vehicle'} has been cancelled`;
        break;
      case 'completed':
        message = `Your booking for ${bookingData.carName || 'vehicle'} is now complete`;
        break;
      default:
        message = `Booking update for ${bookingData.carName || 'vehicle'}`;
    }

    // Get EAT timestamp for notification
    const eatTimestamp = new Date(new Date().getTime() + (3 * 60 * 60 * 1000)).toISOString();

    io.to(`user_${userId}`).emit('notification', {
      type: 'booking',
      title,
      message,
      priority: action === 'cancelled' ? 'high' : 'normal',
      data: bookingData,
      timestamp: eatTimestamp
    });

    console.log(`🔔 Sent booking notification to user ${userId}: ${message}`);
  }
};

export const emitPaymentNotification = (userId, paymentData, status) => {
  if (io) {
    const title = `Payment ${status}`;
    const message = `Payment ${status}: KSH ${paymentData.amount?.toLocaleString() || 'N/A'}`;

    io.to(`user_${userId}`).emit('notification', {
      type: 'payment',
      title,
      message,
      priority: status === 'failed' ? 'high' : 'normal',
      data: paymentData,
      timestamp: new Date().toISOString()
    });

    console.log(`🔔 Sent payment notification to user ${userId}: ${message}`);
  }
};

export const emitSystemNotification = (userId, title, message, priority = 'normal') => {
  if (io) {
    io.to(`user_${userId}`).emit('notification', {
      type: 'system',
      title,
      message,
      priority,
      timestamp: new Date().toISOString()
    });

    console.log(`🔔 Sent system notification to user ${userId}: ${message}`);
  }
};

// Function to load pending notifications when user comes online
const loadPendingNotifications = (socket) => {
  try {
    const userId = socket.user.id;
    
    // Get all unread chat notifications for this user
    const notificationsResult = query(`
      SELECT cn.*, c.make, c.model, u.first_name, u.last_name, u.role as sender_role
      FROM chat_notifications cn
      JOIN chat_messages cm ON cn.last_message_id = cm.id
      JOIN users u ON cm.sender_id = u.id
      JOIN cars c ON CAST(SUBSTR(cn.chat_room, 6, INSTR(SUBSTR(cn.chat_room, 6), '_') - 1) AS INTEGER) = c.id
      WHERE cn.user_id = ? AND cn.unread_count > 0
      ORDER BY cn.last_updated DESC
    `, [userId]);
    
    if (notificationsResult.rows.length > 0) {
      console.log(`📬 Loading ${notificationsResult.rows.length} pending notifications for ${socket.user.first_name}`);
      
      notificationsResult.rows.forEach(notification => {
        const carDetails = `${notification.make} ${notification.model}`;
        const senderName = `${notification.first_name} ${notification.last_name}`;
        
        socket.emit('new_notification', {
          type: 'missed_message',
          chatRoom: notification.chat_room,
          carDetails: carDetails,
          senderName: notification.sender_role === 'host' ? `🔑 Car Owner: ${notification.first_name}` : `🚗 Customer: ${notification.first_name}`,
          senderRole: notification.sender_role,
          recipientRole: socket.user.role,
          message: `You have ${notification.unread_count} unread message${notification.unread_count > 1 ? 's' : ''} about ${carDetails}`,
          messageId: notification.last_message_id,
          unreadCount: notification.unread_count,
          chatContext: 'pending'
        });
      });
    }
  } catch (error) {
    console.error('Error loading pending notifications:', error);
  }
};

export const emitBroadcastNotification = (title, message, type = 'system', priority = 'normal') => {
  if (io) {
    io.emit('notification', {
      type,
      title,
      message,
      priority,
      timestamp: new Date().toISOString()
    });

    console.log(`📢 Broadcast notification sent: ${message}`);
  }
};

// Function to send notifications to specific users
export const sendNotificationToUser = (userId, notification) => {
  if (io) {
    io.to(`user_${userId}`).emit('notification', notification);
  }
};

// Function to send booking updates
export const sendBookingUpdate = (userId, bookingData) => {
  if (io) {
    io.to(`user_${userId}`).emit('booking_update', bookingData);
  }
};

export default { initializeSocket, sendNotificationToUser, sendBookingUpdate };