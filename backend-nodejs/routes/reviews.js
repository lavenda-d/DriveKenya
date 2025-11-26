import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database-sqlite.js';
import { authenticateToken } from '../middleware/auth.js';
import { uploadReviewMultiple } from '../middleware/uploadReview.js';

const router = express.Router();

// Create review (public, but authenticated)
router.post('/', authenticateToken, uploadReviewMultiple, [
  body('carId').isInt().withMessage('Valid car ID is required'),
  body('rentalId').isInt().withMessage('Valid rental ID is required'), 
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('rating_vehicle').optional().isInt({ min: 1, max: 5 }),
  body('rating_cleanliness').optional().isInt({ min: 1, max: 5 }),
  body('rating_communication').optional().isInt({ min: 1, max: 5 }),
  body('rating_value').optional().isInt({ min: 1, max: 5 }),
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

    const carId = parseInt(req.body.carId);
    const rentalId = parseInt(req.body.rentalId);
    const rating = parseInt(req.body.rating);
    const comment = req.body.comment || null;
    const rating_vehicle = req.body.rating_vehicle ? parseInt(req.body.rating_vehicle) : null;
    const rating_cleanliness = req.body.rating_cleanliness ? parseInt(req.body.rating_cleanliness) : null;
    const rating_communication = req.body.rating_communication ? parseInt(req.body.rating_communication) : null;
    const rating_value = req.body.rating_value ? parseInt(req.body.rating_value) : null;

    // Verify rental exists and belongs to user and is completed
    const rentalResult = await query(`
      SELECT id FROM rentals 
      WHERE id = ? AND car_id = ? AND renter_id = ? AND status = 'completed'
    `, [rentalId, carId, req.user.id]);

    if (rentalResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid rental - rental must be completed by you to leave a review'
      });
    }

    // Check if review already exists
    const existingReview = await query(`
      SELECT id FROM reviews WHERE rental_id = ?
    `, [rentalId]);

    if (existingReview.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Review already exists for this rental'
      });
    }

    // Create review
    const insertResult = await query(`
      INSERT INTO reviews (
        car_id, reviewer_id, rental_id, rating,
        rating_vehicle, rating_cleanliness, rating_communication, rating_value,
        comment, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [carId, req.user.id, rentalId, rating, rating_vehicle, rating_cleanliness, rating_communication, rating_value, comment]);

    const newReviewId = insertResult.insertId;

    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const imageUrl = `/uploads/reviews/${file.filename}`;
        query('INSERT INTO review_photos (review_id, image_url) VALUES (?, ?)', [newReviewId, imageUrl]);
      });
    }

    // Update car rating and review count
    await query(`
      UPDATE cars SET 
        rating = (SELECT ROUND(AVG(rating), 2) FROM reviews WHERE car_id = ?),
        review_count = (SELECT COUNT(*) FROM reviews WHERE car_id = ?)
      WHERE id = ?
    `, [carId, carId, carId]);

    const reviewRow = await query('SELECT * FROM reviews WHERE id = ?', [newReviewId]);
    const photos = await query('SELECT id, image_url FROM review_photos WHERE review_id = ?', [newReviewId]);

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: { review: { ...reviewRow.rows[0], photos: photos.rows } }
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
      SELECT 
        r.*, 
        (u.first_name || ' ' || u.last_name) as reviewer_name
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      WHERE r.car_id = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `, [parseInt(carId), parseInt(limit), offset]);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total FROM reviews WHERE car_id = ?
    `, [parseInt(carId)]);

    const total = parseInt(countResult.rows[0].total);

    const reviews = result.rows;
    if (reviews.length > 0) {
      const ids = reviews.map(r => r.id);
      const placeholders = ids.map(() => '?').join(',');
      const photosRes = await query(`
        SELECT id, review_id, image_url 
        FROM review_photos 
        WHERE review_id IN (${placeholders})
      `, ids);
      const responsesRes = await query(`
        SELECT review_id, responder_id, content, created_at, updated_at 
        FROM review_responses 
        WHERE review_id IN (${placeholders})
      `, ids);

      const photosByReview = {};
      photosRes.rows.forEach(p => {
        if (!photosByReview[p.review_id]) photosByReview[p.review_id] = [];
        photosByReview[p.review_id].push({ id: p.id, image_url: p.image_url });
      });

      const responseByReview = {};
      responsesRes.rows.forEach(r => {
        responseByReview[r.review_id] = r;
      });

      reviews.forEach(r => {
        r.photos = photosByReview[r.id] || [];
        r.response = responseByReview[r.id] || null;
      });
    }

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

// Ratings summary and breakdown for a car (public)
router.get('/car/:carId/summary', async (req, res, next) => {
  try {
    const carId = parseInt(req.params.carId);
    const agg = await query(`
      SELECT 
        COUNT(*) AS total,
        ROUND(AVG(rating), 2) AS avg_rating,
        ROUND(AVG(rating_vehicle), 2) AS avg_vehicle,
        ROUND(AVG(rating_cleanliness), 2) AS avg_cleanliness,
        ROUND(AVG(rating_communication), 2) AS avg_communication,
        ROUND(AVG(rating_value), 2) AS avg_value
      FROM reviews WHERE car_id = ?
    `, [carId]);

    const distributionRows = await query(`
      SELECT rating, COUNT(*) AS count 
      FROM reviews WHERE car_id = ? 
      GROUP BY rating
    `, [carId]);

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distributionRows.rows.forEach(row => {
      distribution[row.rating] = row.count;
    });

    const a = agg.rows[0] || {};
    res.json({
      success: true,
      data: {
        total: a.total || 0,
        average: a.avg_rating ? parseFloat(a.avg_rating) : 0,
        categories: {
          vehicle: a.avg_vehicle ? parseFloat(a.avg_vehicle) : 0,
          cleanliness: a.avg_cleanliness ? parseFloat(a.avg_cleanliness) : 0,
          communication: a.avg_communication ? parseFloat(a.avg_communication) : 0,
          value: a.avg_value ? parseFloat(a.avg_value) : 0
        },
        distribution
      }
    });
  } catch (error) {
    next(error);
  }
});

// Car owner response endpoints
router.post('/:id/response', authenticateToken, [
  body('content').isString().isLength({ min: 1, max: 2000 })
], async (req, res, next) => {
  try {
    const reviewId = parseInt(req.params.id);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const review = await query(`
      SELECT r.id, r.car_id, c.host_id 
      FROM reviews r 
      JOIN cars c ON r.car_id = c.id 
      WHERE r.id = ?
    `, [reviewId]);

    if (review.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }
    if (review.rows[0].host_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to respond to this review' });
    }

    const existing = await query('SELECT id FROM review_responses WHERE review_id = ?', [reviewId]);
    if (existing.rows.length > 0) {
      await query('UPDATE review_responses SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE review_id = ?', [req.body.content, reviewId]);
    } else {
      await query('INSERT INTO review_responses (review_id, responder_id, content) VALUES (?, ?, ?)', [reviewId, req.user.id, req.body.content]);
    }

    const responseRow = await query('SELECT review_id, responder_id, content, created_at, updated_at FROM review_responses WHERE review_id = ?', [reviewId]);
    res.json({ success: true, data: { response: responseRow.rows[0] } });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/response', authenticateToken, [
  body('content').isString().isLength({ min: 1, max: 2000 })
], async (req, res, next) => {
  try {
    const reviewId = parseInt(req.params.id);
    const review = await query(`
      SELECT r.id, r.car_id, c.host_id 
      FROM reviews r 
      JOIN cars c ON r.car_id = c.id 
      WHERE r.id = ?
    `, [reviewId]);

    if (review.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }
    if (review.rows[0].host_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to respond to this review' });
    }

    const existing = await query('SELECT id FROM review_responses WHERE review_id = ?', [reviewId]);
    if (existing.rows.length === 0) {
      await query('INSERT INTO review_responses (review_id, responder_id, content) VALUES (?, ?, ?)', [reviewId, req.user.id, req.body.content]);
    } else {
      await query('UPDATE review_responses SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE review_id = ?', [req.body.content, reviewId]);
    }

    const responseRow = await query('SELECT review_id, responder_id, content, created_at, updated_at FROM review_responses WHERE review_id = ?', [reviewId]);
    res.json({ success: true, data: { response: responseRow.rows[0] } });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/response', authenticateToken, async (req, res, next) => {
  try {
    const reviewId = parseInt(req.params.id);
    const review = await query(`
      SELECT r.id, r.car_id, c.host_id 
      FROM reviews r 
      JOIN cars c ON r.car_id = c.id 
      WHERE r.id = ?
    `, [reviewId]);

    if (review.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }
    if (review.rows[0].host_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this response' });
    }

    await query('DELETE FROM review_responses WHERE review_id = ?', [reviewId]);
    res.json({ success: true, message: 'Response deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;