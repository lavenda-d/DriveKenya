import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Middleware to authenticate user
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'driveKenya-secret-2024');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Validation for booking
const validateBooking = [
  body('carId').isInt().withMessage('Valid car ID is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  body('pickupLocation').optional().trim().isLength({ max: 255 }),
  body('dropoffLocation').optional().trim().isLength({ max: 255 }),
  body('specialRequests').optional().trim().isLength({ max: 1000 }),
];

// Create a new booking
router.post('/create', authenticateToken, validateBooking, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { carId, startDate, endDate, pickupLocation, dropoffLocation, specialRequests } = req.body;
    const userId = req.user.userId;

    // Check if car exists and is available
    const carResult = await query(
      'SELECT * FROM cars WHERE id = ? AND available = 1',
      [carId]
    );

    if (carResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Car not found or not available'
      });
    }

    const car = carResult.rows[0];

    // Calculate rental duration and total price
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    if (days <= 0) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    const totalPrice = car.price_per_day * days;

    // Check for conflicting bookings
    const conflictCheck = await query(
      `SELECT COUNT(*) as count FROM rentals 
       WHERE car_id = ? 
       AND status NOT IN ('cancelled', 'completed')
       AND ((start_date <= ? AND end_date > ?) OR (start_date < ? AND end_date >= ?))`,
      [carId, startDate, startDate, endDate, endDate]
    );

    if (conflictCheck.rows[0].count > 0) {
      return res.status(409).json({
        success: false,
        message: 'Car is already booked for the selected dates'
      });
    }

    // Create booking
    const bookingResult = await query(
      `INSERT INTO rentals (car_id, renter_id, start_date, end_date, total_price, status, pickup_location, dropoff_location, special_requests, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, datetime('now'), datetime('now'))`,
      [carId, userId, startDate, endDate, totalPrice, pickupLocation, dropoffLocation, specialRequests]
    );

    const bookingId = bookingResult.insertId;

    // Get booking details with car and user info
    const bookingDetails = await query(
      `SELECT r.*, c.make, c.model, c.year, c.location as car_location,
              u.first_name, u.last_name, u.email, u.phone
       FROM rentals r
       JOIN cars c ON r.car_id = c.id
       JOIN users u ON r.renter_id = u.id
       WHERE r.id = ?`,
      [bookingId]
    );

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking: bookingDetails.rows[0],
      totalPrice,
      days
    });

  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during booking creation',
      error: error.message
    });
  }
});

// Get user's bookings
router.get('/my-bookings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const bookings = await query(
      `SELECT r.*, c.make, c.model, c.year, c.images, c.price_per_day
       FROM rentals r
       JOIN cars c ON r.car_id = c.id
       WHERE r.renter_id = ?
       ORDER BY r.created_at DESC`,
      [userId]
    );

    // Parse JSON fields
    const processedBookings = bookings.rows.map(booking => ({
      ...booking,
      images: JSON.parse(booking.images || '[]')
    }));

    res.json({
      success: true,
      bookings: processedBookings
    });

  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error getting bookings',
      error: error.message
    });
  }
});

// Get booking by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user.userId;

    const booking = await query(
      `SELECT r.*, c.make, c.model, c.year, c.images, c.features, c.location as car_location,
              u.first_name, u.last_name, u.email, u.phone
       FROM rentals r
       JOIN cars c ON r.car_id = c.id
       JOIN users u ON r.renter_id = u.id
       WHERE r.id = ? AND (r.renter_id = ? OR c.host_id = ?)`,
      [bookingId, userId, userId]
    );

    if (booking.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Parse JSON fields
    const bookingData = {
      ...booking.rows[0],
      images: JSON.parse(booking.rows[0].images || '[]'),
      features: JSON.parse(booking.rows[0].features || '[]')
    };

    res.json({
      success: true,
      booking: bookingData
    });

  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error getting booking',
      error: error.message
    });
  }
});

// Cancel booking
router.put('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user.userId;

    // Check if booking exists and belongs to user
    const booking = await query(
      'SELECT * FROM rentals WHERE id = ? AND renter_id = ?',
      [bookingId, userId]
    );

    if (booking.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or unauthorized'
      });
    }

    const bookingData = booking.rows[0];

    // Check if booking can be cancelled
    if (bookingData.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled'
      });
    }

    if (bookingData.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel completed booking'
      });
    }

    // Update booking status
    await query(
      `UPDATE rentals SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`,
      [bookingId]
    );

    res.json({
      success: true,
      message: 'Booking cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error cancelling booking',
      error: error.message
    });
  }
});

// Get all bookings (admin/host only)
router.get('/admin/all', authenticateToken, async (req, res) => {
  try {
    // For now, allow all authenticated users, but in production check for admin role
    const bookings = await query(
      `SELECT r.*, c.make, c.model, c.year, c.location as car_location,
              u.first_name, u.last_name, u.email, u.phone
       FROM rentals r
       JOIN cars c ON r.car_id = c.id
       JOIN users u ON r.renter_id = u.id
       ORDER BY r.created_at DESC
       LIMIT 50`,
      []
    );

    res.json({
      success: true,
      bookings: bookings.rows
    });

  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error getting all bookings',
      error: error.message
    });
  }
});

export default router;