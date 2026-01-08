import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// CRITICAL: Import env config FIRST to load environment variables before any routes
import './config/env.js';

// Import routes AFTER env config is loaded
import authRoutes from './routes/auth.js';
import passwordResetRoutes from './routes/passwordReset.js';
import userRoutes from './routes/users.js';
import carRoutes from './routes/cars.js';
import rentalRoutes from './routes/rentals.js';
import reviewRoutes from './routes/reviews.js';
import messageRoutes from './routes/messages.js';
import contactRoutes from './routes/contact.js';
import paymentRoutes from './routes/payments.js';
import mpesaRoutes from './routes/mpesa.js';
import notificationRoutes from './routes/notifications.js';
import adminRoutes from './routes/admin.js';
import ownerRoutes from './routes/owner.js';
import pricingRoutes from './routes/pricing.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { authenticateToken, requireAdmin } from './middleware/auth.js';
import { uploadAvatar, uploadDocument } from './middleware/uploadUser.js';

// Import WebSocket service
import { initializeSocket } from './services/socketService.js';

// Import database gateway
import { query, createTables } from './config/database.js';

const app = express();

// Universal CORS middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : [process.env.FRONTEND_URL || 'http://localhost:3000'];

  if (allowedOrigins.includes(origin) || !origin) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }

  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH,HEAD');
  res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization,Cache-Control,X-HTTP-Method-Override');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

const server = createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize WebSocket
const io = initializeSocket(server);

// Test CORS endpoint - should be accessible
app.get('/api/test-cors', (req, res) => {
  console.log('🧪 Test CORS endpoint hit');
  res.json({ success: true, message: 'CORS is working!', origin: req.headers.origin });
});

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "https://*.google.com", "http://localhost:*"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://maps.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV !== 'production' && req.ip === '127.0.0.1'
});
app.use('/api/', limiter);

console.log(`✅ Rate limiting enabled for /api/ routes (${process.env.NODE_ENV === 'production' ? 'Strict' : 'Relaxed for localhost'})`);

// Enhanced CORS configuration is now handled by universal middleware above
// This is kept for reference but not needed
const corsOptions = {
  origin: function (origin, callback) {
    callback(null, true); // Allow all origins in development
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-HTTP-Method-Override'
  ],
  exposedHeaders: ['Authorization'],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 200
};

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files (for uploaded images)
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// BOOKING ENDPOINTS - Must be first to avoid conflicts
// Test POST endpoint (should work without auth)
app.post('/api/bookings/test-post', (req, res) => {
  console.log('🧪 TEST-POST endpoint reached with body:', req.body);
  res.json({ success: true, message: 'POST endpoint works!', body: req.body });
});

// Simple booking test
app.post('/api/bookings/simple-test', (req, res) => {
  console.log('🔧 SIMPLE-TEST endpoint reached with body:', req.body);
  const { carId } = req.body;
  res.json({ success: true, message: 'Simple test works!', receivedCarId: carId, fullBody: req.body });
});

// Get user bookings endpoint
app.get('/api/bookings/my-bookings', authenticateToken, async (req, res) => {
  try {
    const result = query(`
      SELECT r.*, c.make, c.model, c.year, c.location as car_location,
             u.first_name || ' ' || u.last_name as host_name, u.phone as host_phone
      FROM rentals r
      JOIN cars c ON r.car_id = c.id
      JOIN users u ON c.host_id = u.id
      WHERE r.renter_id = ?
      ORDER BY r.created_at DESC
    `, [req.user.id]);

    const bookings = result.rows.map(booking => ({
      id: booking.id,
      car: {
        id: booking.car_id,
        name: `${booking.make} ${booking.model}`,
        year: booking.year,
        location: booking.car_location
      },
      host: {
        name: booking.host_name,
        phone: booking.host_phone
      },
      startDate: booking.start_date,
      endDate: booking.end_date,
      totalPrice: booking.total_price,
      status: booking.status,
      pickupLocation: booking.pickup_location,
      dropoffLocation: booking.dropoff_location,
      specialRequests: booking.special_requests,
      createdAt: booking.created_at
    }));

    res.json({
      success: true,
      bookings: bookings
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bookings',
      message: error.message
    });
  }
});

// Cancel booking endpoint
app.put('/api/bookings/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const bookingId = req.params.id;

    // Check if booking exists and belongs to the user
    const bookingCheck = query(`
      SELECT * FROM rentals 
      WHERE id = ? AND renter_id = ?
    `, [bookingId, req.user.id]);

    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or unauthorized'
      });
    }

    // Update booking status to cancelled
    query(`
      UPDATE rentals 
      SET status = 'cancelled' 
      WHERE id = ? AND renter_id = ?
    `, [bookingId, req.user.id]);

    console.log(`✅ Booking ${bookingId} cancelled successfully`);

    res.json({
      success: true,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel booking',
      message: error.message
    });
  }
});

// OPTIONS handler for booking create route
app.options('/api/bookings/create', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Create booking endpoint - conflict-checked
app.post('/api/bookings/create', authenticateToken, async (req, res) => {
  try {
    const authenticatedUser = req.user;
    console.log('🎯 Booking request received:', req.body);
    console.log('👤 Authenticated user:', authenticatedUser);

    const {
      carId,
      startDate,
      endDate,
      totalPrice,
      pickupLocation,
      dropoffLocation,
      specialRequests
    } = req.body;

    console.log('🚗 Looking for car with ID:', carId);

    // Check if car exists first
    const carExistsResult = query('SELECT * FROM cars WHERE id = ?', [carId]);
    console.log('🔍 Car exists query result:', carExistsResult.rows.length, 'cars found');

    if (carExistsResult.rows.length === 0) {
      console.log('❌ Car not found in database');
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }

    // Check if car is available
    const carResult = query('SELECT * FROM cars WHERE id = ? AND available = 1', [carId]);
    console.log('🔍 Available car query result:', carResult.rows.length, 'available cars found');

    if (carResult.rows.length === 0) {
      console.log('❌ Car exists but not available');
      return res.status(400).json({
        success: false,
        message: 'Car is currently not available for booking'
      });
    }

    // Calculate dates and enforce min notice
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const now = new Date();
    const minNotice = Number(carResult.rows[0].min_notice_hours || 0);
    if (minNotice > 0 && startDateObj.getTime() < now.getTime() + (minNotice * 60 * 60 * 1000)) {
      return res.status(400).json({ success: false, message: `Bookings must be made at least ${minNotice} hours in advance` });
    }

    // Calculate total price if not provided
    let finalTotalPrice = totalPrice;
    if (!finalTotalPrice) {
      const days = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24));
      const carPrice = carResult.rows[0].price_per_day;
      finalTotalPrice = days * carPrice;
      console.log(`💰 Calculated price: ${days} days × ${carPrice} = ${finalTotalPrice}`);
    }

    // Check for conflicting bookings (respect buffer_days)
    const bufferDays = Math.ceil((carResult.rows[0].buffer_hours || 0) / 24);
    const dateMinusDays = (d, n) => {
      const x = new Date(d);
      x.setDate(x.getDate() - n);
      return x.toISOString().split('T')[0];
    };
    const datePlusDays = (d, n) => {
      const x = new Date(d);
      x.setDate(x.getDate() + n);
      return x.toISOString().split('T')[0];
    };
    const checkStart = bufferDays > 0 ? dateMinusDays(startDate, bufferDays) : startDate;
    const checkEnd = bufferDays > 0 ? datePlusDays(endDate, bufferDays) : endDate;
    const conflictCheck = query(`
      SELECT COUNT(*) as count FROM rentals 
      WHERE car_id = ? 
      AND status NOT IN ('cancelled','completed')
      AND ((start_date <= ? AND end_date > ?) OR (start_date < ? AND end_date >= ?) OR (start_date >= ? AND end_date <= ?))
    `, [carId, checkStart, checkStart, checkEnd, checkEnd, checkStart, checkEnd]);

    if ((conflictCheck.rows?.[0]?.count || 0) > 0) {
      return res.status(409).json({
        success: false,
        message: 'Car is already booked for the selected dates'
      });
    }

    // Create booking
    const result = query(`
      INSERT INTO rentals (
        car_id, renter_id, start_date, end_date, total_price,
        pickup_location, dropoff_location, special_requests, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [carId, authenticatedUser.id, startDate, endDate, finalTotalPrice, pickupLocation, dropoffLocation, specialRequests]);

    console.log('✅ Booking created successfully with ID:', result.insertId);

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      bookingId: result.insertId
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create booking',
      message: error.message
    });
  }
});

// Get booking by ID
app.get('/api/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = query(`
      SELECT r.*, c.make, c.model, c.year, c.location as car_location,
             u.first_name || ' ' || u.last_name as host_name, u.phone as host_phone, u.email as host_email
      FROM rentals r
      JOIN cars c ON r.car_id = c.id
      JOIN users u ON c.host_id = u.id
      WHERE r.id = ? AND r.renter_id = ?
    `, [id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const booking = result.rows[0];
    res.json({
      success: true,
      booking: {
        id: booking.id,
        car: {
          id: booking.car_id,
          name: `${booking.make} ${booking.model}`,
          year: booking.year,
          location: booking.car_location
        },
        host: {
          name: booking.host_name,
          phone: booking.host_phone,
          email: booking.host_email
        },
        startDate: booking.start_date,
        endDate: booking.end_date,
        totalPrice: booking.total_price,
        status: booking.status,
        pickupLocation: booking.pickup_location,
        dropoffLocation: booking.dropoff_location,
        specialRequests: booking.special_requests,
        createdAt: booking.created_at
      }
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch booking',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Nairobi Car Hire API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Nairobi Car Hire API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Status endpoint for frontend connection check
app.get('/api/status', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Nairobi Car Hire API is operational',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime()
  });
});

// Get user's own cars
app.get('/api/cars/my/cars', authenticateToken, async (req, res) => {
  try {
    const result = query('SELECT * FROM cars WHERE host_id = ? ORDER BY created_at DESC', [req.user.id]);

    const cars = result.rows.map(car => ({
      id: car.id,
      make: car.make,
      model: car.model,
      year: car.year,
      color: car.color,
      price_per_day: car.price_per_day,
      location: car.location,
      description: car.description,
      features: JSON.parse(car.features || '[]'),
      images: JSON.parse(car.images || '[]'),
      available: car.available === 1,
      license_plate: car.license_plate,
      created_at: car.created_at,
      buffer_hours: car.buffer_hours || 0,
      min_notice_hours: car.min_notice_hours || 0
    }));

    res.json({
      success: true,
      count: cars.length,
      cars: cars
    });
  } catch (error) {
    console.error('Get my cars error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user cars',
      message: error.message
    });
  }
});

// Get current user info
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = query('SELECT id, email, first_name, last_name, phone, role, email_verified, avatar_url, is_verified, created_at FROM users WHERE id = ?', [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        name: `${user.first_name} ${user.last_name}`,
        phone: user.phone,
        role: user.role,
        email_verified: user.email_verified === 1,
        avatar_url: user.avatar_url || null,
        is_verified: user.is_verified === 1,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user info',
      message: error.message
    });
  }
});

// User profile endpoints
app.get('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const result = query('SELECT id, email, first_name, last_name, phone, role, email_verified, avatar_url, is_verified, created_at FROM users WHERE id = ?', [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      profile: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        role: user.role,
        email_verified: user.email_verified === 1,
        avatar_url: user.avatar_url || null,
        is_verified: user.is_verified === 1,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile',
      message: error.message
    });
  }
});

app.put('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    let { first_name, last_name, name, phone } = req.body;
    // Accept either combined name or separate fields
    if (!first_name && !last_name && name) {
      const parts = String(name).trim().split(/\s+/);
      first_name = parts[0] || name;
      last_name = parts.slice(1).join(' ') || '';
    }
    // Ensure non-null to satisfy NOT NULL constraints
    first_name = (first_name ?? '').toString();
    last_name = (last_name ?? '').toString();

    const result = query(`
      UPDATE users SET 
        first_name = ?, 
        last_name = ?, 
        phone = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [first_name, last_name, phone, req.user.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      message: error.message
    });
  }
});

// Simple cars endpoint for frontend
app.get('/api/cars-simple', async (req, res) => {
  try {
    const result = query(`
      SELECT * FROM cars
      WHERE available = 1 
      ORDER BY created_at DESC
    `);

    const cars = result.rows.map(car => ({
      id: car.id,
      make: car.make,
      model: car.model,
      year: car.year,
      color: car.color,
      price_per_day: car.price_per_day,
      location: car.location,
      description: car.description,
      features: JSON.parse(car.features || '[]'),
      images: JSON.parse(car.images || '[]'),
      available: car.available === 1,
      rating: car.rating || null,
      review_count: car.review_count || 0,
      host_id: car.host_id, // Include host_id for chat functionality
      owner_name: car.owner_name, // Owner name from cars table
      owner_email: car.owner_email, // Owner email from cars table
      owner_phone: car.owner_phone, // Owner phone from cars table
      name: `${car.make} ${car.model}` // Add name property for chat modal
    }));

    res.json({
      success: true,
      count: cars.length,
      cars: cars
    });
  } catch (error) {
    console.error('Cars API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cars',
      message: error.message
    });
  }
});

// Get chat notification counts for authenticated user
app.get('/api/chat/notifications', authenticateToken, async (req, res) => {
  try {

    // Get total unread count across all chat rooms for this user
    const result = query(`
      SELECT 
        SUM(unread_count) as total_unread,
        COUNT(*) as chat_rooms_with_messages
      FROM chat_notifications 
      WHERE user_id = ? AND unread_count > 0
    `, [req.user.id]);

    const notificationData = result.rows[0] || { total_unread: 0, chat_rooms_with_messages: 0 };

    // Get detailed breakdown by chat room
    const roomBreakdown = query(`
      SELECT 
        cn.chat_room,
        cn.unread_count,
        cn.last_updated,
        cm.message as last_message,
        u.first_name || ' ' || u.last_name as sender_name
      FROM chat_notifications cn
      LEFT JOIN chat_messages cm ON cn.last_message_id = cm.id
      LEFT JOIN users u ON cm.sender_id = u.id
      WHERE cn.user_id = ? AND cn.unread_count > 0
      ORDER BY cn.last_updated DESC
    `, [req.user.id]);

    res.json({
      success: true,
      data: {
        total_unread: notificationData.total_unread || 0,
        chat_rooms_with_messages: notificationData.chat_rooms_with_messages || 0,
        chat_rooms: roomBreakdown.rows
      }
    });

  } catch (error) {
    console.error('Notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', passwordResetRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/rentals', authenticateToken, rentalRoutes);
app.use('/api/reviews', reviewRoutes);
// Contact form endpoint - public (no authentication required)
app.use('/api/contact', contactRoutes);
// Message endpoints - require authentication  
app.use('/api/messages', authenticateToken, messageRoutes);
app.use('/api/payments', authenticateToken, paymentRoutes);
app.use('/api/mpesa', mpesaRoutes); // M-Pesa routes (webhook is public, others require auth)
app.use('/api/notifications', notificationRoutes);

// Phase 3 Business Features
app.use('/api/admin', adminRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/pricing', pricingRoutes);

// Phase 4 Advanced Features
try {
  const recommendationRoutes = await import('./routes/recommendations.js');
  const trackingRoutes = await import('./routes/tracking.js');
  const emergencyRoutes = await import('./routes/emergency.js');
  const performanceRoutes = await import('./routes/performance.js');
  const fraudRoutes = await import('./routes/fraud.js');
  const supportRoutes = await import('./routes/support.js');

  app.use('/api/recommendations', authenticateToken, recommendationRoutes.default);
  app.use('/api/tracking', authenticateToken, trackingRoutes.default);
  app.use('/api/emergency', authenticateToken, emergencyRoutes.default);
  app.use('/api/performance', performanceRoutes.default);
  app.use('/api/fraud', authenticateToken, fraudRoutes.default);
  app.use('/api/support', authenticateToken, supportRoutes.default);

  console.log('✅ Phase 4 advanced feature routes loaded');
} catch (error) {
  console.warn('⚠️ Some Phase 4 routes not available:', error.message);
}

// Test booking endpoint (public, no auth for testing)
app.get('/api/bookings/test', (req, res) => {
  res.json({ success: true, message: 'Booking endpoints are working!' });
});

// Test booking create endpoint (public, no auth for testing)
app.post('/api/bookings/test-create', (req, res) => {
  res.json({ success: true, message: 'POST booking endpoint is working!', body: req.body });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server with WebSocket support
const startServer = async () => {
  try {
    // Initialize database tables
    await createTables();

    server.listen(PORT, () => {
      console.log(`🚗 Nairobi Car Hire API server running on port ${PORT}`);
      console.log(`🔌 WebSocket server initialized for real-time chat`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;