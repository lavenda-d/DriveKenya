import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database-sqlite.js';

const router = express.Router();

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
        token
      }
    });

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
      'SELECT id, first_name, last_name, email, password, phone, role, email_verified FROM users WHERE email = ?',
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
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = generateToken(user.id);

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
          isVerified: user.email_verified
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