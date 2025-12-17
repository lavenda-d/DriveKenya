import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';
import { query } from '../config/database-sqlite.js';
import { emailUser, emailPassword, emailHost, emailPort } from '../config/env.js';

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// Debug: Check if EMAIL_PASSWORD is loaded
console.log('📧 Email Configuration:', {
  EMAIL_USER: emailUser || '❌ Missing',
  EMAIL_PASSWORD: emailPassword ? `✅ Loaded (${emailPassword.length} chars)` : '❌ Missing',
  EMAIL_HOST: emailHost
});

if (!emailPassword || !emailUser) {
  console.error('❌ EMAIL_USER or EMAIL_PASSWORD not found in environment variables!');
  console.error('⚠️  Password reset emails will NOT work until you set both in .env');
}

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

// Verify transporter configuration on startup
mailTransporter.verify(function (error, success) {
  if (error) {
    console.error('❌ SMTP configuration error:', error);
  } else {
    console.log('✅ SMTP server is ready to send emails');
  }
});

// Request password reset
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if user exists
    const result = query(
      'SELECT id, first_name, email FROM users WHERE email = ?',
      [email]
    );

    if (result.rows.length === 0) {
      // Don't reveal if email exists or not (security best practice)
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    const user = result.rows[0];
    const resetToken = uuidv4();
    const resetExpires = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now

    // Store reset token
    query(
      'UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?',
      [resetToken, resetExpires, user.id]
    );

    // Send reset email
    const resetLink = `${FRONTEND_URL}?resetToken=${encodeURIComponent(resetToken)}`;
    const from = process.env.EMAIL_FROM || 'drivekenyaorg@gmail.com';
    const subject = 'DriveKenya Password Reset';
    const displayName = (user.first_name || '').toString().trim();
    const text = `Hello${displayName ? ' ' + displayName : ''},\n\nYou requested a password reset. Click the link below to reset your password:\n\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">Password Reset Request</h2>
        <p>Hello${displayName ? ' ' + displayName : ''},</p>
        <p>You requested a password reset for your DriveKenya account.</p>
        <p>Click the button below to reset your password:</p>
        <a href="${resetLink}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">Reset Password</a>
        <p>Or copy this link: <a href="${resetLink}">${resetLink}</a></p>
        <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
        <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
      </div>
    `;

    try {
      await mailTransporter.sendMail({ from, to: email, subject, text, html });
      console.log('✉️ Password reset email sent successfully to:', email);
    } catch (emailError) {
      console.error('❌ Failed to send password reset email:', emailError.message);
      // Don't return error to user for security (don't reveal if email exists)
    }

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });

  } catch (error) {
    next(error);
  }
});

// Reset password with token
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Find user with valid token
    const result = query(
      `SELECT id FROM users 
       WHERE password_reset_token = ? 
       AND datetime(password_reset_expires) > datetime('now')`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    const userId = result.rows[0].id;

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear reset token
    query(
      `UPDATE users 
       SET password = ?, 
           password_reset_token = NULL, 
           password_reset_expires = NULL,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [passwordHash, userId]
    );

    console.log('✅ Password reset successful for user:', userId);

    res.json({
      success: true,
      message: 'Password reset successful! You can now login with your new password.'
    });

  } catch (error) {
    next(error);
  }
});

export default router;
