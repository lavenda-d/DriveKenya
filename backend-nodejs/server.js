import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import carRoutes from './routes/cars.js';
import rentalRoutes from './routes/rentals.js';
import reviewRoutes from './routes/reviews.js';
import messageRoutes from './routes/messages.js';
import contactRoutes from './routes/contact.js';
import paymentRoutes from './routes/payments.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { authenticateToken } from './middleware/auth.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:3001',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
}));

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
    const { query } = await import('./config/database-sqlite.js');
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
    const { query } = await import('./config/database-sqlite.js');
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

// Create booking endpoint - WORKING VERSION
app.post('/api/bookings/create', async (req, res) => {
  try {
    // Manual auth check since middleware has issues with body parsing
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }
    
    const token = authHeader.substring(7);
    const jwt = (await import('jsonwebtoken')).default;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const authenticatedUser = decoded;
    console.log('🎯 Booking request received:', req.body);
    console.log('👤 Authenticated user:', authenticatedUser);
    
    const { query } = await import('./config/database-sqlite.js');
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

    // Calculate total price if not provided
    let finalTotalPrice = totalPrice;
    if (!finalTotalPrice) {
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      const days = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24));
      const carPrice = carResult.rows[0].price_per_day;
      finalTotalPrice = days * carPrice;
      console.log(`💰 Calculated price: ${days} days × ${carPrice} = ${finalTotalPrice}`);
    }

    // Create booking
    const result = query(`
      INSERT INTO rentals (
        car_id, renter_id, start_date, end_date, total_price,
        pickup_location, dropoff_location, special_requests, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [carId, authenticatedUser.userId, startDate, endDate, finalTotalPrice, pickupLocation, dropoffLocation, specialRequests]);

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
    const { query } = await import('./config/database-sqlite.js');
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
    const { query } = await import('./config/database-sqlite.js');
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
      created_at: car.created_at
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
    const { query } = await import('./config/database-sqlite.js');
    const result = query('SELECT id, email, first_name, last_name, phone, role, email_verified, created_at FROM users WHERE id = ?', [req.user.id]);
    
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
    const { query } = await import('./config/database-sqlite.js');
    const result = query('SELECT id, email, first_name, last_name, phone, role, email_verified, created_at FROM users WHERE id = ?', [req.user.id]);
    
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
    const { query } = await import('./config/database-sqlite.js');
    const { first_name, last_name, phone } = req.body;
    
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
    const { query } = await import('./config/database-sqlite.js');
    const result = query('SELECT * FROM cars WHERE available = 1 ORDER BY created_at DESC');
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
      available: car.available === 1
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

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/rentals', authenticateToken, rentalRoutes);
app.use('/api/reviews', reviewRoutes);
// Contact form endpoint - public (no authentication required)
app.use('/api/contact', contactRoutes);
// Message endpoints - require authentication  
app.use('/api/messages', authenticateToken, messageRoutes);
app.use('/api/payments', authenticateToken, paymentRoutes);

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

// Start server
app.listen(PORT, () => {
  console.log(`🚗 Nairobi Car Hire API server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export default app;