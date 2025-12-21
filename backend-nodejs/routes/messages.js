import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';

const router = express.Router();

// Send message
router.post('/', [
  body('receiverId').notEmpty().withMessage('Valid receiver ID is required'),
  body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('Message content is required and must be less than 1000 characters'),
  body('rentalId').optional().notEmpty().withMessage('Valid rental ID is required'),
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

    const { receiverId, content, rentalId } = req.body;

    // Verify receiver exists
    const receiverResult = query(`
      SELECT id FROM users WHERE id = ?
    `, [receiverId]);

    if (receiverResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found'
      });
    }

    // Create message - SQLite doesn't support RETURNING, so we'll insert and get the ID
    const result = query(`
      INSERT INTO messages (sender_id, recipient_id, content, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `, [req.user.id, receiverId, content]);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { messageId: result.insertId }
    });

  } catch (error) {
    next(error);
  }
});

// Get user's messages
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = query(`
      SELECT m.*, 
        sender.name as sender_name,
        recipient.name as recipient_name
      FROM messages m
      JOIN users sender ON m.sender_id = sender.id
      JOIN users recipient ON m.recipient_id = recipient.id
      WHERE m.sender_id = ? OR m.recipient_id = ?
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `, [req.user.id, req.user.id, parseInt(limit), offset]);

    // Mark received messages as read
    query(`
      UPDATE messages SET read_status = 1 
      WHERE recipient_id = ? AND read_status = 0
    `, [req.user.id]);

    res.json({
      success: true,
      data: { messages: result.rows }
    });

  } catch (error) {
    next(error);
  }
});

// Get all customers who have inquired about a specific car (for car owners)
router.get('/car-inquiries/:carId', async (req, res, next) => {
  try {
    const { carId } = req.params;

    // Verify user is the car owner
    const carResult = query('SELECT host_id FROM cars WHERE id = ?', [carId]);
    if (carResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }

    if (carResult.rows[0].host_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view inquiries for this car'
      });
    }

    // Get all unique customers who have sent messages about this car
    // We'll look for messages mentioning the car in bookings/rentals or messages table
    const inquiriesResult = query(`
      SELECT DISTINCT
        u.id as customer_id,
        u.name as customer_name,
        u.email as customer_email,
        u.avatar_url,
        MAX(m.created_at) as last_message_date,
        COUNT(m.id) as message_count,
        SUM(CASE WHEN m.read_status = 0 AND m.recipient_id = ? THEN 1 ELSE 0 END) as unread_count
      FROM messages m
      JOIN users u ON (m.sender_id = u.id AND m.recipient_id = ?)
      WHERE m.sender_id != ?
        AND (
          m.content LIKE ? 
          OR m.rental_id IN (
            SELECT r.id FROM rentals r WHERE r.car_id = ?
          )
        )
      GROUP BY u.id, u.name, u.email, u.avatar_url
      ORDER BY last_message_date DESC
    `, [req.user.id, req.user.id, req.user.id, `%car%${carId}%`, carId]);

    res.json({
      success: true,
      data: { inquiries: inquiriesResult.rows || [] }
    });

  } catch (error) {
    next(error);
  }
});



export default router;