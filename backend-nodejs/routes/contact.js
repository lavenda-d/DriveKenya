import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database-sqlite.js';

const router = express.Router();

// Contact form endpoint (no authentication required)
router.post('/', [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('subject').optional().trim().isLength({ max: 200 }).withMessage('Subject too long'),
  body('message').trim().isLength({ min: 1, max: 2000 }).withMessage('Message is required'),
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

    const { name, email, subject, message } = req.body;

    // For contact form, we'll use sender_id = 1 (admin) and store contact info in the content
    // In production, you might want to create a separate contact_messages table
    const result = query(`
      INSERT INTO messages (sender_id, recipient_id, subject, content, read_status, created_at)
      VALUES (1, 1, ?, ?, 0, datetime('now'))
    `, [
      subject || `Contact Form: ${name}`,
      `CONTACT FORM MESSAGE\n\nFrom: ${name}\nEmail: ${email}\nSubject: ${subject || 'No subject'}\n\nMessage:\n${message}`
    ]);

    // Log the contact form submission
    console.log(`📧 Contact form submission from ${name} (${email}): ${subject || 'No subject'}`);

    res.status(201).json({
      success: true,
      message: 'Thank you for your message! We will get back to you soon.',
      data: {
        id: result.insertId,
        submitted_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Contact form error:', error);
    next(error);
  }
});

export default router;