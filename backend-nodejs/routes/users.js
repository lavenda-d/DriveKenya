import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database-sqlite.js';

const router = express.Router();

// Get user profile
router.get('/profile', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT id, name, email, phone, is_car_owner, avatar_url, is_verified, role, created_at
      FROM users WHERE id = $1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user: result.rows[0] }
    });

  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/profile', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number is required'),
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

    const { name, phone, isCarOwner } = req.body;

    const result = await query(`
      UPDATE users SET 
        name = $1, 
        phone = $2, 
        is_car_owner = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING id, name, email, phone, is_car_owner, avatar_url, is_verified, role
    `, [name, phone, isCarOwner || false, req.user.id]);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: result.rows[0] }
    });

  } catch (error) {
    next(error);
  }
});

export default router;