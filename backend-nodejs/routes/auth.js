import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database-sqlite.js';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

const mailTransporter = (() => {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
      auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      } : undefined,
    });
  }
  return nodemailer.createTransport({ jsonTransport: true });
})();

const sendVerificationEmail = async (to, token, name) => {
  const verifyLink = `${BACKEND_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  const from = process.env.EMAIL_FROM || 'no-reply@drivekenya.local';
  const subject = 'Verify your DriveKenya email';
  const displayName = (name || '').toString().trim();
  const text = `Hello${displayName ? ' ' + displayName : ''},\n\nPlease verify your email by clicking the link below:\n${verifyLink}\n\nIf you did not create an account, you can ignore this email.`;
  const html = `<p>Hello${displayName ? ' ' + displayName : ''},</p><p>Please verify your email by clicking the link below:</p><p><a href="${verifyLink}">Verify Email</a></p><p>If you did not create an account, you can ignore this email.</p>`;
  await mailTransporter.sendMail({ from, to, subject, text, html });
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Validation middleware
const validateRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('phone')
    .optional({ checkFalsy: true })
    .isMobilePhone()
    .withMessage('Phone number must be valid if provided'),
  body('role')
    .optional()
    .isIn(['customer', 'owner', 'host'])
    .withMessage('Role must be either customer, owner, or host'),
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// Register new user
router.post('/register', validateRegistration, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password, phone, role, accountType } = req.body;
    
    // Determine the user role (prioritize 'role', then 'accountType', default to 'customer')
    const userRole = role || accountType || 'customer';
    // Map 'owner' to 'host' for consistency with existing database
    const finalRole = userRole === 'owner' ? 'host' : userRole;

    // Check if user already exists
    const existingUser = query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    console.log('🔐 Hashing password with salt rounds:', saltRounds);
    const passwordHash = await bcrypt.hash(password, saltRounds);
    console.log('✅ Password hash created:', { 
      length: passwordHash.length, 
      prefix: passwordHash.substring(0, 10) 
    });

    // Create user
    const result = query(
      `INSERT INTO users (first_name, last_name, email, password, phone, role)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name.split(' ')[0] || name, name.split(' ').slice(1).join(' ') || '', email, passwordHash, phone || '', finalRole]
    );

    const emailToken = uuidv4();
    query('UPDATE users SET email_verification_token = ?, email_verification_sent_at = CURRENT_TIMESTAMP, email_verified = 0 WHERE id = ?', [emailToken, result.insertId]);
    try {
      await sendVerificationEmail(email, emailToken, name.split(' ')[0] || name);
      console.log('✉️ Sent verification email to', email);
    } catch (e) {
      console.error('Email send error:', e.message);
    }

    const token = generateToken(result.insertId);

    res.status(201).json({
      success: true,
      message: `${finalRole === 'host' ? 'Car owner' : 'Customer'} registered successfully`,
      data: {
        user: {
          id: result.insertId,
          name: name,
          email: email,
          phone: phone || '',
          role: finalRole,
          accountType: finalRole
        },
        token,
        emailVerificationSent: true
      }
    });

  } catch (error) {
    next(error);
  }
});

router.post('/resend-verification', async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    const result = query('SELECT id, first_name, email_verified FROM users WHERE email = ?', [email]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      if (!user.email_verified) {
        const token = uuidv4();
        query('UPDATE users SET email_verification_token = ?, email_verification_sent_at = CURRENT_TIMESTAMP WHERE id = ?', [token, user.id]);
        try {
          await sendVerificationEmail(email, token, user.first_name);
          console.log('✉️ Resent verification email to', email);
        } catch (e) {
          console.error('Email resend error:', e.message);
        }
      }
    }
    res.json({ success: true, message: 'If the email exists and is unverified, a verification email has been sent.' });
  } catch (error) {
    next(error);
  }
});

router.get('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, message: 'Verification token is required' });
    }
    const result = query('SELECT id FROM users WHERE email_verification_token = ?', [token]);
    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
    }
    const userId = result.rows[0].id;
    query('UPDATE users SET email_verified = 1, email_verification_token = NULL, email_verification_sent_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [userId]);
    const redirectUrl = `${FRONTEND_URL}?emailVerified=1`;
    try {
      return res.redirect(302, redirectUrl);
    } catch (_) {
      return res.json({ success: true, message: 'Email verified successfully' });
    }
  } catch (error) {
    next(error);
  }
});

// Login user
router.post('/login', validateLogin, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;
    console.log('🔍 Login attempt:', { email, passwordLength: password.length });

    // Find user
    const result = query(
      'SELECT id, first_name, last_name, email, password, phone, role, email_verified, failed_login_attempts, locked_until, avatar_url, is_verified FROM users WHERE email = ?',
      [email]
    );

    console.log('👤 User query result:', { found: result.rows.length > 0, email });

    if (result.rows.length === 0) {
      console.log('❌ User not found for email:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = result.rows[0];
    if (user.locked_until) {
      const lockedUntil = new Date(user.locked_until);
      if (!isNaN(lockedUntil.getTime()) && lockedUntil > new Date()) {
        return res.status(423).json({
          success: false,
          message: 'Account locked. Try again later.'
        });
      }
    }

    console.log('🔐 Password comparison:', { 
      inputLength: password.length, 
      hashLength: user.password.length,
      hashPrefix: user.password.substring(0, 10) 
    });

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('✅ Password valid:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('❌ Password mismatch for user:', email);
      const attempts = (user.failed_login_attempts || 0) + 1;
      let lockUntil = null;
      if (attempts >= 5) {
        lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }
      query('UPDATE users SET failed_login_attempts = ?, locked_until = COALESCE(?, locked_until) WHERE id = ?', [attempts, lockUntil, user.id]);
      return res.status(401).json({
        success: false,
        message: attempts >= 5 ? 'Too many failed attempts. Account locked for 15 minutes.' : 'Invalid email or password'
      });
    }
    if (!user.email_verified) {
      return res.status(403).json({
        success: false,
        message: 'Email not verified. Please check your inbox for the verification email or resend a new one.',
        needs_verification: true
      });
    }

    const token = generateToken(user.id);

    query('UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isVerified: user.email_verified,
          avatar_url: user.avatar_url,
          is_profile_verified: user.is_verified
        },
        token
      }
    });

  } catch (error) {
    next(error);
  }
});

// Verify token endpoint
router.get('/verify', async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = query(
      'SELECT id, first_name, last_name, email, phone, role, email_verified FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          isCarOwner: user.is_car_owner,
          role: user.role,
          isVerified: user.is_verified
        }
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    next(error);
  }
});

// Google Sign-Up endpoint (placeholder for future OAuth integration)
router.post('/google-signup', async (req, res, next) => {
  try {
    const { googleToken, role, accountType } = req.body;
    
    // TODO: Verify Google token with Google OAuth API
    // For now, return a placeholder response
    res.status(200).json({
      success: false,
      message: 'Google Sign-Up is coming soon! Please use regular registration for now.',
      data: {
        isPlaceholder: true,
        selectedRole: role || accountType || 'customer',
        instructions: 'This feature will be implemented with Google OAuth 2.0 integration.'
      }
    });

  } catch (error) {
    next(error);
  }
});

export default router;