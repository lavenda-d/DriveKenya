import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database-sqlite.js';

const router = express.Router();

// Create review (public, but authenticated)
router.post('/', [
  body('carId').isUUID().withMessage('Valid car ID is required'),
  body('rentalId').isUUID().withMessage('Valid rental ID is required'), 
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim().isLength({ max: 1000 }).withMessage('Comment must be less than 1000 characters'),
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

    const { carId, rentalId, rating, comment } = req.body;

    // Verify rental exists and belongs to user and is completed
    const rentalResult = await query(`
      SELECT id FROM rentals 
      WHERE id = $1 AND car_id = $2 AND renter_id = $3 AND status = 'completed'
    `, [rentalId, carId, req.user.id]);

    if (rentalResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid rental - rental must be completed by you to leave a review'
      });
    }

    // Check if review already exists
    const existingReview = await query(`
      SELECT id FROM reviews WHERE rental_id = $1
    `, [rentalId]);

    if (existingReview.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Review already exists for this rental'
      });
    }

    // Create review
    const result = await query(`
      INSERT INTO reviews (car_id, reviewer_id, rental_id, rating, comment)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [carId, req.user.id, rentalId, rating, comment]);

    // Update car rating and review count
    await query(`
      UPDATE cars SET 
        rating = (SELECT AVG(rating)::DECIMAL(3,2) FROM reviews WHERE car_id = $1),
        review_count = (SELECT COUNT(*) FROM reviews WHERE car_id = $1)
      WHERE id = $1
    `, [carId]);

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: { review: result.rows[0] }
    });

  } catch (error) {
    next(error);
  }
});

// Get reviews for a car (public)
router.get('/car/:carId', async (req, res, next) => {
  try {
    const { carId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await query(`
      SELECT r.*, u.name as reviewer_name
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      WHERE r.car_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `, [carId, parseInt(limit), offset]);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total FROM reviews WHERE car_id = $1
    `, [carId]);

    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: {
        reviews: result.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

export default router;