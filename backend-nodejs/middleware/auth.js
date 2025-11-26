import jwt from 'jsonwebtoken';
import { query } from '../config/database-sqlite.js';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token required' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database to ensure they still exist
    const result = await query(
      'SELECT id, first_name, last_name, email, role, email_verified FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    // Reduce spam by only logging JWT signature errors once per minute
    const now = Date.now();
    if (!global.lastAuthJWTError || (now - global.lastAuthJWTError) > 60000) {
      console.error('Token verification error:', error.name === 'JsonWebTokenError' ? 'JWT signature invalid - clear browser storage' : error.message);
      global.lastAuthJWTError = now;
    }
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Admin access required' 
    });
  }
  next();
};

export const requireVerified = (req, res, next) => {
  const enforce = (process.env.ENFORCE_EMAIL_VERIFICATION || '').toLowerCase() === 'true' || process.env.NODE_ENV === 'production';
  if (!enforce) {
    console.log('⚠️ Email verification check bypassed for development');
    return next();
  }
  if (!req.user.email_verified) {
    return res.status(403).json({ 
      success: false, 
      message: 'Email verification required' 
    });
  }
  next();
};