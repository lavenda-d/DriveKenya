import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';

const router = express.Router();

// Create rental booking
router.post('/', [
  body('carId').isUUID().withMessage('Valid car ID is required'),
  body('startTime').isISO8601().withMessage('Valid start time is required'),
  body('endTime').isISO8601().withMessage('Valid end time is required'),
  body('pickupLocation').trim().isLength({ min: 1 }).withMessage('Pickup location is required'),
  body('dropoffLocation').trim().isLength({ min: 1 }).withMessage('Dropoff location is required'),
  body('paymentMethod').isIn(['stripe', 'cash']).withMessage('Valid payment method is required'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      carId,
      startTime,
      endTime,
      pickupLocation,
      dropoffLocation,
      paymentMethod,
      additionalNotes = ''
    } = req.body;

    // Validate dates
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time'
      });
    }

    if (start <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Start time must be in the future'
      });
    }

    // Check if car exists and is available
    const carResult = await query(`
      SELECT * FROM cars WHERE id = $1 AND status = 'available' AND is_active = true
    `, [carId]);

    if (carResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Car not found or not available'
      });
    }

    const car = carResult.rows[0];

    // Check for conflicting bookings
    const conflictResult = await query(`
      SELECT id FROM rentals 
      WHERE car_id = $1 
      AND status IN ('confirmed', 'active') 
      AND (
        (start_time <= $2 AND end_time > $2) OR
        (start_time < $3 AND end_time >= $3) OR
        (start_time >= $2 AND end_time <= $3)
      )
    `, [carId, startTime, endTime]);

    if (conflictResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Car is already booked for the selected time period'
      });
    }

    // Calculate total amount
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffHours / 24);

    let totalAmount = 0;
    if (diffDays >= 7) {
      const weeks = Math.floor(diffDays / 7);
      const remainingDays = diffDays % 7;
      totalAmount = (weeks * parseFloat(car.weekly_rate)) + (remainingDays * parseFloat(car.daily_rate));
    } else if (diffDays >= 1) {
      totalAmount = diffDays * parseFloat(car.daily_rate);
    } else {
      totalAmount = diffHours * parseFloat(car.hourly_rate);
    }

    // Create rental
    const result = await query(`
      INSERT INTO rentals (
        car_id, renter_id, start_time, end_time, total_amount,
        payment_method, pickup_location, dropoff_location, additional_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      carId, req.user.id, startTime, endTime, totalAmount,
      paymentMethod, pickupLocation, dropoffLocation, additionalNotes
    ]);

    res.status(201).json({
      success: true,
      message: 'Rental booking created successfully',
      data: { rental: result.rows[0] }
    });

  } catch (error) {
    next(error);
  }
});

// Get user's rentals
router.get('/', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT r.*, c.make, c.model, c.year, c.images, u.name as owner_name, u.phone as owner_phone
      FROM rentals r
      JOIN cars c ON r.car_id = c.id
      JOIN users u ON c.owner_id = u.id
      WHERE r.renter_id = $1
      ORDER BY r.created_at DESC
    `, [req.user.id]);

    res.json({
      success: true,
      data: { rentals: result.rows }
    });

  } catch (error) {
    next(error);
  }
});

// Get single rental
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT r.*, c.*, u.name as owner_name, u.phone as owner_phone, u.email as owner_email
      FROM rentals r
      JOIN cars c ON r.car_id = c.id
      JOIN users u ON c.owner_id = u.id
      WHERE r.id = $1 AND (r.renter_id = $2 OR c.owner_id = $2)
    `, [id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rental not found'
      });
    }

    res.json({
      success: true,
      data: { rental: result.rows[0] }
    });

  } catch (error) {
    next(error);
  }
});

// Update rental status (for car owners)
router.patch('/:id/status', [
  body('status').isIn(['confirmed', 'active', 'completed', 'cancelled']).withMessage('Valid status is required'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    // Check if user is the car owner or admin
    const rentalResult = await query(`
      SELECT r.*, c.owner_id 
      FROM rentals r
      JOIN cars c ON r.car_id = c.id
      WHERE r.id = $1
    `, [id]);

    if (rentalResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rental not found'
      });
    }

    const rental = rentalResult.rows[0];

    if (rental.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - you can only update rentals for your own cars'
      });
    }

    const result = await query(`
      UPDATE rentals SET 
        status = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [status, id]);

    res.json({
      success: true,
      message: 'Rental status updated successfully',
      data: { rental: result.rows[0] }
    });

  } catch (error) {
    next(error);
  }
});

export default router;