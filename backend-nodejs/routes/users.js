import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import { uploadAvatar, uploadDocument } from '../middleware/uploadUser.js';
import fs from 'fs/promises';

const router = express.Router();

// Get user profile
router.get('/profile', async (req, res, next) => {
  try {
    const result = query(`
      SELECT id, first_name, last_name, email, phone, is_car_owner, avatar_url, profile_photo, is_verified, role, created_at
      FROM users WHERE id = ?
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Add name field by combining first and last name
    const user = result.rows[0];
    user.name = `${user.first_name || ''} ${user.last_name || ''}`.trim();

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    next(error);
  }
});

// Save emergency contacts (creates table if missing)
// Get emergency contacts
router.get('/emergency-contacts', async (req, res, next) => {
  try {
    const userId = req.user.id;

    const contacts = await query(
      `SELECT * FROM user_emergency_contacts WHERE user_id = ? ORDER BY type`,
      [userId]
    );

    const result = {
      primary: null,
      secondary: null
    };

    contacts.forEach(contact => {
      result[contact.type] = {
        name: contact.name,
        relationship: contact.relationship,
        phone: contact.phone
      };
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get emergency contacts error:', error);
    next(error);
  }
});

router.put('/emergency-contacts', [
  body('primary').optional().isObject(),
  body('secondary').optional().isObject(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    // Ensure table exists
    await query(`
      CREATE TABLE IF NOT EXISTS user_emergency_contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT CHECK(type IN ('primary','secondary')) NOT NULL,
        name TEXT,
        relationship TEXT,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const { primary, secondary } = req.body || {};
    const userId = req.user.id;

    // Upsert contacts
    const upsert = async (contact, type) => {
      if (!contact) return;
      const { name, relationship, phone } = contact;
      const existing = await query(`SELECT id FROM user_emergency_contacts WHERE user_id = ? AND type = ?`, [userId, type]);
      if (existing.length > 0) {
        await query(`UPDATE user_emergency_contacts SET name = ?, relationship = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [name || '', relationship || '', phone || '', existing[0].id]);
      } else {
        await query(`INSERT INTO user_emergency_contacts (user_id, type, name, relationship, phone) VALUES (?, ?, ?, ?, ?)`, [userId, type, name || '', relationship || '', phone || '']);
      }
    };

    await upsert(primary, 'primary');
    await upsert(secondary, 'secondary');

    res.json({ success: true, message: 'Emergency contacts saved' });

  } catch (error) {
    console.error('Emergency contacts error:', error);
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
    const fileObj = (req.files && req.files.avatar && req.files.avatar[0])
      || (req.files && req.files.photo && req.files.photo[0]);

    if (!fileObj) {
      return res.status(400).json({
        success: false,
        message: 'No photo uploaded'
      });
    }

    // Generate photo URL (absolute to ensure cross-origin load from frontend)
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:5000';
    const photoUrl = `${baseUrl}/uploads/users/${fileObj.filename}`;

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
    if (req.files) {
      if (req.files.avatar && req.files.avatar[0]) {
        await fs.unlink(req.files.avatar[0].path).catch(console.error);
      }
      if (req.files.photo && req.files.photo[0]) {
        await fs.unlink(req.files.photo[0].path).catch(console.error);
      }
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
    // Check if table exists first
    const tableCheck = await query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='user_verification_documents'
    `);

    if (tableCheck.length === 0) {
      // Table doesn't exist yet, return not_submitted
      return res.json({
        success: true,
        status: 'not_submitted'
      });
    }

    const result = await query(`
      SELECT status, document_type, created_at, reviewed_at, rejection_reason
      FROM user_verification_documents
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [req.user.id]);
    const rows = result?.rows ?? result; // support both drivers

    if (!rows || rows.length === 0) {
      return res.json({
        success: true,
        status: 'not_submitted'
      });
    }

    res.json({
      success: true,
      status: rows[0].status,
      documentType: rows[0].document_type,
      submittedAt: rows[0].created_at,
      reviewedAt: rows[0].reviewed_at,
      rejectionReason: rows[0].rejection_reason
    });

  } catch (error) {
    console.error('Verification status error:', error);
    // Return not_submitted on any error to prevent breaking the UI
    res.json({
      success: true,
      status: 'not_submitted'
    });
  }
});

export default router;