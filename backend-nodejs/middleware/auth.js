import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  // Check if token looks like a JWT (has 3 parts separated by dots)
  if (!token.includes('.') || token.split('.').length !== 3) {
    console.error('Malformed token received:', token.substring(0, 20) + '...');
    return res.status(401).json({
      success: false,
      message: 'Invalid token format. Please log in again.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'driveKenya-secret-2024');

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
      console.error('Token verification error:', error.name, error.message);
      global.lastAuthJWTError = now;
    }

    // Return 401 for expired tokens, 403 for invalid tokens
    const statusCode = error.name === 'TokenExpiredError' ? 401 : 403;
    return res.status(statusCode).json({
      success: false,
      message: error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token',
      error: error.message
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

export const requireAdminOrOwner = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'host') {
    return res.status(403).json({
      success: false,
      message: 'Admin or car owner access required'
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