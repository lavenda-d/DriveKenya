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
    console.log(`📧 Email configured: ${emailUser} via ${emailHost}:${emailPort}`);
    const transporter = nodemailer.createTransport({
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
    
    // Verify connection on startup
    transporter.verify((error, success) => {
      if (error) {
        console.error('❌ Email transporter verification failed:', error.message);
      } else {
        console.log('✅ Email transporter is ready to send emails');
      }
    });
    
    return transporter;
  }
  console.warn('⚠️  Email credentials not configured, using JSON transport (emails will not be sent)');
  return nodemailer.createTransport({ jsonTransport: true });
})();

const sendVerificationEmail = async (to, token, name) => {
  const verifyLink = `${BACKEND_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  const from = process.env.EMAIL_FROM || 'no-reply@drivekenya.local';
  const subject = '🔐 Verify your DriveKenya email to complete registration';
  const displayName = (name || '').toString().trim();
  const text = `Hello${displayName ? ' ' + displayName : ''},\n\nPlease verify your email by clicking the link below to complete your registration:\n${verifyLink}\n\nThis link expires in 24 hours.\n\nIf you did not create an account, you can ignore this email.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">🚗 DriveKenya</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1f2937;">Hello${displayName ? ' ' + displayName : ''}! 👋</h2>
        <p style="color: #4b5563; font-size: 16px;">Please verify your email to complete your registration:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyLink}" style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block;">
            ✅ Verify My Email
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">This link expires in 24 hours.</p>
        <p style="color: #9ca3af; font-size: 12px;">If you did not create an account, you can ignore this email.</p>
      </div>
    </div>
  `;
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

// Register new user - stores in pending_users until email verification
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

    // Check if user already exists in main users table
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

    // Check if there's a pending registration
    const existingPending = query(
      'SELECT id, token_expires_at FROM pending_users WHERE email = ?',
      [email]
    );

    // Hash password
    const saltRounds = 12;
    console.log('🔐 Hashing password with salt rounds:', saltRounds);
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate verification token
    const verificationToken = uuidv4();
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    const firstName = name.split(' ')[0] || name;
    const lastName = name.split(' ').slice(1).join(' ') || '';

    if (existingPending.rows.length > 0) {
      // Update existing pending registration
      query(
        `UPDATE pending_users 
         SET password = ?, first_name = ?, last_name = ?, phone = ?, role = ?, 
             verification_token = ?, token_expires_at = ?, created_at = CURRENT_TIMESTAMP
         WHERE email = ?`,
        [passwordHash, firstName, lastName, phone || '', finalRole, verificationToken, tokenExpiresAt, email]
      );
      console.log('📝 Updated pending registration for:', email);
    } else {
      // Create new pending registration
      query(
        `INSERT INTO pending_users (email, password, first_name, last_name, phone, role, verification_token, token_expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [email, passwordHash, firstName, lastName, phone || '', finalRole, verificationToken, tokenExpiresAt]
      );
      console.log('📝 Created pending registration for:', email);
    }

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken, firstName);
      console.log('✉️ Sent verification email to', email);
    } catch (e) {
      console.error('Email send error:', e.message);
      // If email fails but service is configured, still return success but warn
      if (emailUser && emailPassword) {
        return res.status(201).json({
          success: true,
          message: 'Registration initiated but email delivery may be delayed. Please check your inbox.',
          requiresVerification: true,
          email: email
        });
      }
    }

    // If email service is not configured, auto-verify and create user immediately
    if (!emailUser || !emailPassword) {
      console.log('⚠️ Email service not configured, auto-verifying user...');
      
      // Create user directly
      const result = query(
        `INSERT INTO users (first_name, last_name, email, password, phone, role, email_verified, account_status, signup_method)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [firstName, lastName, email, passwordHash, phone || '', finalRole, 1, 'complete', 'email']
      );

      // Delete from pending
      query('DELETE FROM pending_users WHERE email = ?', [email]);

      const token = generateToken(result.insertId);

      // Create welcome notifications
      try {
        query(`INSERT INTO notifications (user_id, type, title, message, is_read) VALUES (?, ?, ?, ?, ?)`,
          [result.insertId, 'system', 'Welcome to DriveKenya!', 'Thank you for joining DriveKenya. Start exploring available cars and book your first ride!', 0]);
      } catch (notifError) {
        console.error('Failed to create welcome notifications:', notifError.message);
      }

      return res.status(201).json({
        success: true,
        message: `${finalRole === 'host' ? 'Car owner' : 'Customer'} registered successfully`,
        data: {
          user: {
            id: result.insertId,
            name: name,
            email: email,
            phone: phone || '',
            role: finalRole,
            accountType: finalRole,
            accountStatus: 'complete'
          },
          token
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Please verify your email to complete registration. Check your inbox for the verification link.',
      requiresVerification: true,
      email: email
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

    // First check pending_users table (new flow)
    const pendingResult = query('SELECT id, first_name, email FROM pending_users WHERE email = ?', [email]);
    if (pendingResult.rows.length > 0) {
      const pendingUser = pendingResult.rows[0];
      const newToken = uuidv4();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours from now
      
      query('UPDATE pending_users SET verification_token = ?, token_expires_at = ? WHERE id = ?', 
        [newToken, expiresAt, pendingUser.id]);
      
      try {
        await sendVerificationEmail(email, newToken, pendingUser.first_name);
        console.log('✉️ Resent verification email to pending user:', email);
      } catch (e) {
        console.error('Email resend error:', e.message);
      }
      
      return res.json({ success: true, message: 'Verification email has been resent. Please check your inbox.' });
    }

    // Legacy flow: Check users table for existing unverified users
    const result = query('SELECT id, first_name, email_verified FROM users WHERE email = ?', [email]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      if (!user.email_verified) {
        const token = uuidv4();
        query('UPDATE users SET email_verification_token = ?, email_verification_sent_at = CURRENT_TIMESTAMP WHERE id = ?', [token, user.id]);
        try {
          await sendVerificationEmail(email, token, user.first_name);
          console.log('✉️ Resent verification email to:', email);
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
      return res.redirect(`${FRONTEND_URL}?verificationError=missing_token`);
    }

    // First check pending_users table (new flow)
    const pendingResult = query('SELECT * FROM pending_users WHERE verification_token = ?', [token]);
    
    if (pendingResult.rows.length > 0) {
      const pendingUser = pendingResult.rows[0];
      
      // Check if token has expired
      if (new Date(pendingUser.token_expires_at) < new Date()) {
        return res.redirect(`${FRONTEND_URL}?verificationError=token_expired&email=${encodeURIComponent(pendingUser.email)}`);
      }

      // Check if user already exists (edge case - double verification)
      const existingUser = query('SELECT id FROM users WHERE email = ?', [pendingUser.email]);
      if (existingUser.rows.length > 0) {
        query('DELETE FROM pending_users WHERE id = ?', [pendingUser.id]);
        return res.redirect(`${FRONTEND_URL}?emailVerified=1&message=already_verified`);
      }

      // Create the actual user account
      const result = query(
        `INSERT INTO users (email, password, first_name, last_name, phone, role, email_verified, account_status, signup_method, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [pendingUser.email, pendingUser.password, pendingUser.first_name, pendingUser.last_name, 
         pendingUser.phone, pendingUser.role, 1, 'complete', 'email']
      );

      const newUserId = result.insertId;
      console.log(`✅ User verified and created: ${pendingUser.email} (ID: ${newUserId})`);

      // Delete from pending_users
      query('DELETE FROM pending_users WHERE id = ?', [pendingUser.id]);

      // Create welcome notifications
      try {
        query(`INSERT INTO notifications (user_id, type, title, message, is_read) VALUES (?, ?, ?, ?, ?)`,
          [newUserId, 'system', '🎉 Welcome to DriveKenya!', 'Your email has been verified! Start exploring available cars and book your first ride.', 0]);
        query(`INSERT INTO notifications (user_id, type, title, message, is_read) VALUES (?, ?, ?, ?, ?)`,
          [newUserId, 'system', '✨ Enhanced Features Available', 'Explore our new features: Real-time notifications, M-Pesa payments, and improved booking flow!', 0]);
      } catch (notifError) {
        console.error('Failed to create welcome notifications:', notifError.message);
      }

      return res.redirect(`${FRONTEND_URL}?emailVerified=1&newAccount=1`);
    }

    // Legacy flow: Check users table for existing users who need verification
    const result = query('SELECT id FROM users WHERE email_verification_token = ?', [token]);
    if (result.rows.length === 0) {
      return res.redirect(`${FRONTEND_URL}?verificationError=invalid_token`);
    }
    
    const userId = result.rows[0].id;
    query('UPDATE users SET email_verified = 1, email_verification_token = NULL, email_verification_sent_at = NULL, account_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
      ['complete', userId]);
    
    console.log(`✅ Existing user email verified: ID ${userId}`);
    return res.redirect(`${FRONTEND_URL}?emailVerified=1`);

  } catch (error) {
    console.error('Email verification error:', error);
    return res.redirect(`${FRONTEND_URL}?verificationError=server_error`);
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
      'SELECT id, first_name, last_name, email, password, phone, role, email_verified, failed_login_attempts, locked_until, avatar_url, profile_photo, is_verified, account_status, signup_method FROM users WHERE email = ?',
      [email]
    );

    console.log('👤 User query result:', { found: result.rows.length > 0, email });

    if (result.rows.length === 0) {
      // Check if there's a pending registration
      const pendingResult = query('SELECT email FROM pending_users WHERE email = ?', [email]);
      if (pendingResult.rows.length > 0) {
        return res.status(403).json({
          success: false,
          message: 'Please verify your email to complete registration. Check your inbox for the verification link.',
          needs_verification: true,
          pending_registration: true
        });
      }
      
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

    // Check if profile needs completion (Google users without phone)
    const needsProfileCompletion = user.signup_method === 'google' && (!user.phone || user.phone.trim() === '');

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
          is_profile_verified: user.is_verified,
          accountStatus: user.account_status || 'complete',
          signupMethod: user.signup_method || 'email',
          needsProfileCompletion
        },
        token,
        needsProfileCompletion
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
    let isNewAccount = false;
    let needsProfileCompletion = false;

    if (users.rows.length > 0) {
      // User exists - log them in
      user = users.rows[0];
      console.log(`👤 User already exists. Logging in: ${email}`);

      // Check if profile is incomplete (missing phone for Google users)
      if (user.signup_method === 'google' && (!user.phone || user.phone.trim() === '')) {
        needsProfileCompletion = true;
        // Update account status if needed
        if (user.account_status !== 'incomplete') {
          await query('UPDATE users SET account_status = ? WHERE id = ?', ['incomplete', user.id]);
          user.account_status = 'incomplete';
        }
      }

      // Update last login
      await query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
    } else {
      // User doesn't exist - create new account
      console.log(`🆕 Creating new user via Google: ${email}`);
      isNewAccount = true;

      const desiredRole = role || accountType || 'customer';
      const finalRole = desiredRole === 'owner' ? 'host' : desiredRole;
      const firstName = given_name || 'Google';
      const lastName = family_name || 'User';

      const placeholderPassword = await bcrypt.hash(`google_${googleId}_${Date.now()}`, 10);

      // Google accounts are created immediately but marked as incomplete (missing phone)
      const accountStatus = 'incomplete'; // Phone number is required
      needsProfileCompletion = true;

      const result = await query(
        `INSERT INTO users (
          email, password, first_name, last_name, role, 
          email_verified, avatar_url, is_verified, profile_completed, 
          account_status, signup_method, google_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          email,
          placeholderPassword,
          firstName,
          lastName,
          finalRole,
          1, // email_verified = true (Google verified)
          picture,
          finalRole === 'host' ? 0 : 1,
          0, // profile_completed = false (needs phone)
          accountStatus,
          'google',
          googleId
        ]
      );

      const newUserId = result.insertId;
      console.log(`✅ New Google user created in DB with ID: ${newUserId} (status: incomplete)`);
      
      // Create welcome notification
      try {
        await query(`INSERT INTO notifications (user_id, type, title, message, is_read) VALUES (?, ?, ?, ?, ?)`,
          [newUserId, 'system', '🎉 Welcome to DriveKenya!', 'Complete your profile by adding your phone number to start booking cars.', 0]);
      } catch (notifError) {
        console.error('Failed to create welcome notification:', notifError.message);
      }

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
      avatar: user.avatar_url,
      accountStatus: user.account_status,
      signupMethod: user.signup_method,
      needsProfileCompletion: needsProfileCompletion
    };

    console.log('✨ Google authentication successful for:', email);
    console.log('📦 Sending user to frontend:', { email, accountStatus: user.account_status, needsProfileCompletion });

    res.status(200).json({
      success: true,
      user: normalizedUser,
      token,
      isNewAccount,
      needsProfileCompletion,
      message: needsProfileCompletion 
        ? 'We need a few more details to finish setting up your account.'
        : 'Successfully authenticated with Google!'
    });

  } catch (error) {
    console.error('💥 Google Sign-Up intensive error:', error);
    next(error);
  }
});

// Complete profile endpoint (for Google users missing details)
router.post('/complete-profile', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { phone } = req.body;

    if (!phone || phone.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required to complete your profile'
      });
    }

    // Validate phone number format (Kenyan format)
    const phoneRegex = /^(?:\+254|254|0)?[17]\d{8}$/;
    const cleanPhone = phone.replace(/[\s-]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid Kenyan phone number (e.g., 0712345678 or +254712345678)'
      });
    }

    // Format phone number consistently
    let formattedPhone = cleanPhone;
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.slice(1);
    } else if (formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.slice(1);
    }

    // Update user profile
    await query(
      `UPDATE users 
       SET phone = ?, account_status = 'complete', profile_completed = 1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [formattedPhone, userId]
    );

    console.log(`✅ Profile completed for user ${userId}, phone: ${formattedPhone}`);

    // Get updated user
    const userResult = await query('SELECT * FROM users WHERE id = ?', [userId]);
    const user = userResult.rows[0];

    const { password: _, ...userWithoutPassword } = user;
    const normalizedUser = {
      ...userWithoutPassword,
      firstName: user.first_name,
      lastName: user.last_name,
      name: `${user.first_name} ${user.last_name}`.trim(),
      avatar: user.avatar_url,
      accountStatus: user.account_status,
      signupMethod: user.signup_method,
      needsProfileCompletion: false
    };

    // Create notification
    try {
      await query(`INSERT INTO notifications (user_id, type, title, message, is_read) VALUES (?, ?, ?, ?, ?)`,
        [userId, 'system', '✅ Profile Complete!', 'Your profile is now complete. You can start booking cars!', 0]);
    } catch (notifError) {
      console.error('Failed to create notification:', notifError.message);
    }

    res.json({
      success: true,
      message: 'Profile completed successfully! You can now access all features.',
      user: normalizedUser
    });

  } catch (error) {
    console.error('Profile completion error:', error);
    next(error);
  }
});

// Get account status endpoint
router.get('/account-status', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await query('SELECT account_status, signup_method, phone, profile_completed FROM users WHERE id = ?', [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = result.rows[0];
    const needsProfileCompletion = user.signup_method === 'google' && (!user.phone || user.phone.trim() === '');

    res.json({
      success: true,
      accountStatus: user.account_status,
      signupMethod: user.signup_method,
      profileCompleted: user.profile_completed === 1,
      needsProfileCompletion,
      missingFields: needsProfileCompletion ? ['phone'] : []
    });
  } catch (error) {
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