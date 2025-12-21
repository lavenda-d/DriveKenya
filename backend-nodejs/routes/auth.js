import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { emailUser, emailPassword, emailHost, emailPort } from '../config/env.js';
// Using native fetch from Node 18+

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

const mailTransporter = (() => {
  if (emailUser && emailPassword) {
    return nodemailer.createTransport({
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
  }
  console.warn('⚠️  Email credentials not configured, using JSON transport (emails will not be sent)');
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
    // Auto-verify if email service is not configured
    const shouldVerify = emailUser && emailPassword;
    query('UPDATE users SET email_verification_token = ?, email_verification_sent_at = CURRENT_TIMESTAMP, email_verified = ? WHERE id = ?', [emailToken, shouldVerify ? 0 : 1, result.insertId]);
    try {
      await sendVerificationEmail(email, emailToken, name.split(' ')[0] || name);
      console.log('✉️ Sent verification email to', email);
    } catch (e) {
      console.error('Email send error:', e.message);
    }

    const token = generateToken(result.insertId);

    // Create welcome notifications for new user
    try {
      query(`
        INSERT INTO notifications (user_id, type, title, message, is_read)
        VALUES (?, ?, ?, ?, ?)
      `, [result.insertId, 'system', 'Welcome to DriveKenya!', 'Thank you for joining DriveKenya. Start exploring available cars and book your first ride!', 0]);

      query(`
        INSERT INTO notifications (user_id, type, title, message, is_read)
        VALUES (?, ?, ?, ?, ?)
      `, [result.insertId, 'system', 'Enhanced Features Available', 'New features: Real-time notifications, payment options, and improved booking flow are now live!', 0]);

      console.log('✅ Created welcome notifications for user:', result.insertId);
    } catch (notifError) {
      console.error('Failed to create welcome notifications:', notifError.message);
    }

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
      'SELECT id, first_name, last_name, email, password, phone, role, email_verified, failed_login_attempts, locked_until, avatar_url, profile_photo, is_verified FROM users WHERE email = ?',
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
    // Only enforce verification if email service is configured
    if (emailUser && emailPassword && !user.email_verified) {
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
          profile_photo: user.profile_photo,
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

// Google Sign-Up endpoint
router.post('/google-signup', async (req, res, next) => {
  console.log('🚀 [AUTH] /google-signup endpoint hit!');
  try {
    const { googleToken, role, accountType } = req.body;
    console.log('📦 [AUTH] Request body:', JSON.stringify({ googleToken: googleToken ? '***' : 'missing', role, accountType }));

    if (!googleToken) {
      console.warn('⚠️ [AUTH] Missing googleToken');
      return res.status(400).json({ success: false, message: 'Google token is required' });
    }

    console.log('🔍 Verifying Google token with userinfo API...');
    // 1. Verify Google token and get user info
    const googleResponse = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${googleToken}`);

    if (!googleResponse.ok) {
      const errorData = await googleResponse.json();
      console.error('❌ Google token verification failed:', errorData);
      return res.status(401).json({ success: false, message: 'Invalid Google token', details: errorData });
    }

    const googleUser = await googleResponse.json();
    console.log('✅ Google user info retrieved:', { email: googleUser.email, name: googleUser.name });
    const { email, given_name, family_name, picture, sub: googleId } = googleUser;

    if (!email) {
      console.error('❌ Google account missing email');
      return res.status(400).json({ success: false, message: 'Google account missing email' });
    }

    // 2. Check if user already exists
    console.log(`🔎 Checking if user exists in DB: ${email}`);
    const users = await query('SELECT * FROM users WHERE email = ?', [email]);
    let user;

    if (users.rows.length > 0) {
      // User exists - log them in
      user = users.rows[0];
      console.log(`👤 User already exists. Logging in: ${email}`);

      // Update last login
      await query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
    } else {
      // User doesn't exist - create new account
      console.log(`🆕 Creating new user via Google: ${email}`);

      const desiredRole = role || accountType || 'customer';
      const finalRole = desiredRole === 'owner' ? 'host' : desiredRole;
      const firstName = given_name || 'Google';
      const lastName = family_name || 'User';

      const placeholderPassword = await bcrypt.hash(`google_${googleId}_${Date.now()}`, 10);

      const result = await query(
        `INSERT INTO users (
          email, password, first_name, last_name, role, 
          email_verified, avatar_url, is_verified, profile_completed, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          email,
          placeholderPassword,
          firstName,
          lastName,
          finalRole,
          1, // email_verified = true
          picture,
          finalRole === 'host' ? 0 : 1,
          1 // profile_completed = true
        ]
      );

      const newUserId = result.insertId;
      console.log(`✅ New user created in DB with ID: ${newUserId}`);
      const newUserRows = await query('SELECT * FROM users WHERE id = ?', [newUserId]);
      user = newUserRows.rows[0];
    }

    // 3. Generate JWT
    console.log('🔑 Generating JWT for user:', user.id);
    const token = generateToken(user.id);

    // 4. Return user and token
    const { password: _, ...userWithoutPassword } = user;

    // Normalize for frontend (both snake_case and camelCase)
    const normalizedUser = {
      ...userWithoutPassword,
      firstName: user.first_name,
      lastName: user.last_name,
      name: `${user.first_name} ${user.last_name}`.trim(),
      avatar: user.avatar_url // Some parts might expect avatar
    };

    console.log('✨ Google authentication successful for:', email);
    console.log('📦 Sending user to frontend:', JSON.stringify(normalizedUser));

    res.status(200).json({
      success: true,
      user: normalizedUser,
      token
    });

  } catch (error) {
    console.error('💥 Google Sign-Up intensive error:', error);
    next(error);
  }
});

// ===== BIOMETRIC AUTHENTICATION ENDPOINTS =====

// Check biometric registration status
router.get('/biometric/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const biometric = await query(
      'SELECT * FROM biometric_credentials WHERE user_id = ?',
      [userId]
    );

    res.json({
      success: true,
      registered: biometric.rows.length > 0,
      lastUsed: biometric.rows[0]?.last_used || null
    });
  } catch (error) {
    console.error('Biometric status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check biometric status'
    });
  }
});

// Register biometric credentials
router.post('/biometric/register', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { publicKey, credentialId } = req.body;

    // Check if already registered
    const existing = await query(
      'SELECT * FROM biometric_credentials WHERE user_id = ?',
      [userId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Biometric already registered for this user'
      });
    }

    // Store biometric credential
    await query(
      `INSERT INTO biometric_credentials (user_id, credential_id, public_key, created_at)
       VALUES (?, ?, ?, ?)`,
      [userId, credentialId, publicKey, new Date().toISOString()]
    );

    res.json({
      success: true,
      message: 'Biometric authentication registered successfully'
    });
  } catch (error) {
    console.error('Biometric registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register biometric authentication'
    });
  }
});

// Verify biometric login
router.post('/biometric/verify', async (req, res) => {
  try {
    const { credentialId, signature, challenge } = req.body;

    // Get user by credential
    const credential = await query(
      'SELECT * FROM biometric_credentials WHERE credential_id = ?',
      [credentialId]
    );

    if (credential.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid biometric credential'
      });
    }

    // TODO: Verify signature with stored public key
    // For now, we'll trust the credential

    // Update last used
    await query(
      'UPDATE biometric_credentials SET last_used = ? WHERE credential_id = ?',
      [new Date().toISOString(), credentialId]
    );

    // Get user details
    const user = await query(
      'SELECT id, first_name, last_name, email, role FROM users WHERE id = ?',
      [credential.rows[0].user_id]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const token = generateToken(user.rows[0].id);

    res.json({
      success: true,
      token,
      user: {
        id: user.rows[0].id,
        name: `${user.rows[0].first_name} ${user.rows[0].last_name}`,
        email: user.rows[0].email,
        role: user.rows[0].role
      }
    });
  } catch (error) {
    console.error('Biometric verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Biometric verification failed'
    });
  }
});

// Remove biometric registration
router.delete('/biometric/remove', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    await query(
      'DELETE FROM biometric_credentials WHERE user_id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'Biometric authentication removed successfully'
    });
  } catch (error) {
    console.error('Biometric removal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove biometric authentication'
    });
  }
});

export default router;