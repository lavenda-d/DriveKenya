import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database-sqlite.js';
import { uploadAvatar, uploadDocument } from '../middleware/uploadUser.js';
import fs from 'fs/promises';

const router = express.Router();

// Get user profile
router.get('/profile', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT id, name, email, phone, is_car_owner, avatar_url, profile_photo, is_verified, role, created_at
      FROM users WHERE id = ?
    `, [req.user.id]);

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user: result[0] }
    });

  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/profile', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number is required'),
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

    const { name, phone, isCarOwner } = req.body;

    const result = await query(`
      UPDATE users SET 
        name = ?, 
        phone = ?, 
        is_car_owner = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING id, name, email, phone, is_car_owner, avatar_url, profile_photo, is_verified, role
    `, [name, phone, isCarOwner || false, req.user.id]);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: result[0] }
    });

  } catch (error) {
    next(error);
  }
});

// Upload profile photo
router.post('/profile/photo', uploadAvatar, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No photo uploaded'
      });
    }

    // Generate photo URL
    const photoUrl = `/uploads/users/${req.file.filename}`;

    // Update user's profile photo in database
    await query(`
      UPDATE users 
      SET profile_photo = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [photoUrl, req.user.id]);

    res.json({
      success: true,
      message: 'Profile photo uploaded successfully',
      photoUrl: photoUrl
    });

  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }
    next(error);
  }
});

// Upload verification documents
router.post('/verification/documents', uploadDocument.fields([
  { name: 'frontImage', maxCount: 1 },
  { name: 'backImage', maxCount: 1 }
]), async (req, res, next) => {
  try {
    const { documentType } = req.body;

    if (!documentType) {
      return res.status(400).json({
        success: false,
        message: 'Document type is required'
      });
    }

    if (!req.files || !req.files.frontImage) {
      return res.status(400).json({
        success: false,
        message: 'Front image is required'
      });
    }

    const frontImageUrl = `/uploads/documents/${req.files.frontImage[0].filename}`;
    const backImageUrl = req.files.backImage
      ? `/uploads/documents/${req.files.backImage[0].filename}`
      : null;

    // Check if user already has pending/approved verification
    const existing = await query(`
      SELECT id, status FROM user_verification_documents 
      WHERE user_id = ? AND status IN ('pending', 'approved')
      ORDER BY created_at DESC LIMIT 1
    `, [req.user.id]);

    if (existing.length > 0 && existing[0].status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Your documents are already verified'
      });
    }

    // Insert verification document
    await query(`
      INSERT INTO user_verification_documents 
      (user_id, document_type, front_image_url, back_image_url, status, created_at)
      VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
    `, [req.user.id, documentType, frontImageUrl, backImageUrl]);

    res.json({
      success: true,
      message: 'Documents submitted successfully',
      status: 'pending'
    });

  } catch (error) {
    // Clean up uploaded files on error
    if (req.files) {
      if (req.files.frontImage) {
        await fs.unlink(req.files.frontImage[0].path).catch(console.error);
      }
      if (req.files.backImage) {
        await fs.unlink(req.files.backImage[0].path).catch(console.error);
      }
    }
    next(error);
  }
});

// Get verification status
router.get('/verification/status', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT status, document_type, created_at, reviewed_at, rejection_reason
      FROM user_verification_documents
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [req.user.id]);

    if (result.length === 0) {
      return res.json({
        success: true,
        status: 'not_submitted'
      });
    }

    res.json({
      success: true,
      status: result[0].status,
      documentType: result[0].document_type,
      submittedAt: result[0].created_at,
      reviewedAt: result[0].reviewed_at,
      rejectionReason: result[0].rejection_reason
    });

  } catch (error) {
    next(error);
  }
});

export default router;