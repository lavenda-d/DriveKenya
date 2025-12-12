import express from 'express';
import { query } from '../config/database-sqlite.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get notification count
router.get('/count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Count unread notifications
    const countResult = await query(`
      SELECT COUNT(*) as total_unread 
      FROM notifications 
      WHERE user_id = ? AND is_read = 0
    `, [userId]);

    res.json({
      success: true,
      data: {
        total_unread: countResult.rows[0]?.total_unread || 0
      }
    });
  } catch (error) {
    console.error('Error fetching notification count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification count',
      error: error.message
    });
  }
});

// Get all notifications with optional filter
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { filter = 'all', limit = 50, offset = 0 } = req.query;

    let whereClause = 'WHERE user_id = ?';
    let params = [userId];

    switch (filter) {
      case 'unread':
        whereClause += ' AND is_read = 0';
        break;
      case 'messages':
        whereClause += ' AND type = ?';
        params.push('message');
        break;
      case 'bookings':
        whereClause += ' AND type = ?';
        params.push('booking');
        break;
      case 'system':
        whereClause += ' AND type = ?';
        params.push('system');
        break;
      default:
        // 'all' - no additional filter
        break;
    }

    const notifications = await query(`
      SELECT id, type, title, message, priority, action_url, is_read, created_at, data
      FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    res.json({
      success: true,
      data: {
        notifications: notifications.rows.map(notification => ({
          ...notification,
          data: notification.data ? JSON.parse(notification.data) : null
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
});

// Create new notification
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      recipient_id,
      type,
      title,
      message,
      priority = 'normal',
      action_url = null,
      data = null
    } = req.body;

    // If no recipient_id provided, use current user
    const targetUserId = recipient_id || req.user.id;

    const result = await query(`
      INSERT INTO notifications (user_id, type, title, message, priority, action_url, data)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      targetUserId,
      type,
      title,
      message,
      priority,
      action_url,
      data ? JSON.stringify(data) : null
    ]);

    const notification = {
      id: result.insertId,
      user_id: targetUserId,
      type,
      title,
      message,
      priority,
      action_url,
      data,
      is_read: false,
      created_at: new Date().toISOString()
    };

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notification',
      error: error.message
    });
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    await query(`
      UPDATE notifications 
      SET is_read = 1, read_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND user_id = ?
    `, [notificationId, userId]);

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    await query(`
      UPDATE notifications 
      SET is_read = 1, read_at = CURRENT_TIMESTAMP 
      WHERE user_id = ? AND is_read = 0
    `, [userId]);

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    });
  }
});

// Delete notification
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    await query(`
      DELETE FROM notifications 
      WHERE id = ? AND user_id = ?
    `, [notificationId, userId]);

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
});

export default router;