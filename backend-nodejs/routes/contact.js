import express from 'express';
import { body, validationResult } from 'express-validator';
import nodemailer from 'nodemailer';
import { query } from '../config/database-sqlite.js';
import { emailUser, emailPassword, emailHost, emailPort } from '../config/env.js';

const router = express.Router();

// Email transporter configuration for Gmail
const mailTransporter = nodemailer.createTransport({
  host: emailHost,
  port: emailPort,
  secure: false,
  auth: {
    user: emailUser,
    pass: emailPassword,
  },
  tls: {
    rejectUnauthorized: false
  }
});

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

    // Send email notification to DriveKenya team
    const emailSubject = `New Contact Form Message from ${name}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #3b82f6; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">New Contact Form Message</h2>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>From:</strong> ${name}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p style="margin: 5px 0;"><strong>Subject:</strong> ${subject || 'No subject'}</p>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <div style="background-color: #ffffff; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Message:</h3>
          <p style="color: #555; line-height: 1.6; white-space: pre-wrap;">${message}</p>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background-color: #e8f4fd; border-radius: 6px;">
          <p style="margin: 0; color: #0066cc;">
            <strong>💡 To reply:</strong> Simply reply to this email or send a message to <a href="mailto:${email}">${email}</a>
          </p>
        </div>
      </div>
    `;

    const emailText = `
New Contact Form Message

From: ${name}
Email: ${email}
Subject: ${subject || 'No subject'}
Date: ${new Date().toLocaleString()}

Message:
${message}

To reply, send an email to: ${email}
    `;

    try {
      await mailTransporter.sendMail({
        from: `"DriveKenya Contact Form" <drivekenyaorg@gmail.com>`,
        to: 'drivekenyaorg@gmail.com',
        replyTo: email, // Allow direct reply to the customer
        subject: emailSubject,
        text: emailText,
        html: emailHtml
      });
      console.log('✅ Contact form notification email sent to drivekenyaorg@gmail.com');
    } catch (emailError) {
      console.error('❌ Failed to send contact notification email:', emailError.message);
      // Don't fail the request if email fails
    }

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