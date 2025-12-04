import express from 'express';
import FraudDetectionEngine from '../services/fraudDetectionService.js';
import { requireAdminOrOwner } from '../middleware/auth.js';
const router = express.Router();

const fraudEngine = new FraudDetectionEngine();

// Analyze fraud risk for any action (admin/owner only for manual checks)
router.post('/analyze', requireAdminOrOwner, async (req, res) => {
  try {
    const { userId, action, context } = req.body;
    
    const analysis = await fraudEngine.analyzeFraudRisk(
      userId || req.user?.id,
      action,
      context,
      req.db
    );

    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Fraud analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Fraud analysis failed'
    });
  }
});

// Get fraud alerts (admin/owner only)
router.get('/alerts', requireAdminOrOwner, async (req, res) => {
  try {
    const { filter = 'all', range = '24h' } = req.query;
    
    let whereClause = '';
    let timeFilter = "datetime('now', '-1 day')";
    
    if (range === '7d') timeFilter = "datetime('now', '-7 days')";
    else if (range === '30d') timeFilter = "datetime('now', '-30 days')";
    
    if (filter !== 'all') {
      whereClause = `AND risk_level = '${filter}'`;
    }

    const alerts = await req.db.all(`
      SELECT fa.*, u.email as user_email
      FROM fraud_alerts fa
      JOIN users u ON fa.user_id = u.id
      WHERE fa.created_at > ${timeFilter} ${whereClause}
      ORDER BY fa.created_at DESC
    `);

    res.json({
      success: true,
      alerts
    });
  } catch (error) {
    console.error('Get fraud alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get fraud alerts'
    });
  }
});

// Get fraud statistics (admin/owner only)
router.get('/stats', requireAdminOrOwner, async (req, res) => {
  try {
    const { range = '24h' } = req.query;
    
    let timeFilter = "datetime('now', '-1 day')";
    if (range === '7d') timeFilter = "datetime('now', '-7 days')";
    else if (range === '30d') timeFilter = "datetime('now', '-30 days')";

    const stats = await req.db.get(`
      SELECT 
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as activeAlerts,
        AVG(risk_score) as avgRiskScore,
        COUNT(CASE WHEN risk_level = 'LOW' THEN 1 END) as lowRisk,
        COUNT(CASE WHEN risk_level = 'MEDIUM' THEN 1 END) as mediumRisk,
        COUNT(CASE WHEN risk_level = 'HIGH' THEN 1 END) as highRisk,
        COUNT(CASE WHEN risk_level = 'CRITICAL' THEN 1 END) as criticalRisk,
        COUNT(DISTINCT user_id) as blockedUsers,
        COUNT(*) as investigations
      FROM fraud_alerts
      WHERE created_at > ${timeFilter}
    `);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get fraud stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get fraud statistics'
    });
  }
});

// Get fraud trends (admin/owner only)
router.get('/trends', requireAdminOrOwner, async (req, res) => {
  try {
    const { range = '24h' } = req.query;
    
    let timeFilter = "datetime('now', '-1 day')";
    let groupBy = "strftime('%H', created_at)";
    
    if (range === '7d') {
      timeFilter = "datetime('now', '-7 days')";
      groupBy = "DATE(created_at)";
    } else if (range === '30d') {
      timeFilter = "datetime('now', '-30 days')";
      groupBy = "DATE(created_at)";
    }

    const trends = await req.db.all(`
      SELECT 
        ${groupBy} as time,
        AVG(risk_score) as riskScore,
        COUNT(*) as alerts
      FROM fraud_alerts
      WHERE created_at > ${timeFilter}
      GROUP BY ${groupBy}
      ORDER BY time ASC
    `);

    res.json({
      success: true,
      trends
    });
  } catch (error) {
    console.error('Get fraud trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get fraud trends'
    });
  }
});

// Handle alert action (admin only)
router.post('/alerts/:id/action', async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    
    let status = 'PENDING';
    let notes = '';

    switch (action) {
      case 'investigate':
        status = 'INVESTIGATING';
        notes = 'Alert under investigation';
        break;
      case 'block':
        status = 'BLOCKED';
        notes = 'User blocked due to suspicious activity';
        
        // Block the user
        const alert = await req.db.get('SELECT user_id FROM fraud_alerts WHERE id = ?', [id]);
        if (alert) {
          await req.db.run(
            'UPDATE users SET status = ? WHERE id = ?',
            ['blocked', alert.user_id]
          );
        }
        break;
      case 'false_positive':
        status = 'RESOLVED';
        notes = 'Marked as false positive';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action'
        });
    }

    await req.db.run(`
      UPDATE fraud_alerts SET 
        status = ?, notes = ?, resolved_at = ?
      WHERE id = ?
    `, [status, notes, new Date().toISOString(), id]);

    res.json({
      success: true,
      message: `Alert ${action} completed`
    });
  } catch (error) {
    console.error('Fraud alert action error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process alert action'
    });
  }
});

// Get user risk profile
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get recent fraud detections for user
    const recentDetections = await req.db.all(`
      SELECT * FROM fraud_detections
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `, [userId]);

    // Get user behavior metrics
    const behaviorMetrics = await req.db.get(`
      SELECT 
        COUNT(DISTINCT b.id) as totalBookings,
        COUNT(DISTINCT p.id) as totalPayments,
        AVG(r.rating) as avgRating,
        COUNT(DISTINCT DATE(b.created_at)) as activeDays
      FROM users u
      LEFT JOIN bookings b ON u.id = b.user_id
      LEFT JOIN payments p ON u.id = p.user_id
      LEFT JOIN reviews r ON u.id = r.user_id
      WHERE u.id = ?
    `, [userId]);

    // Calculate risk score
    const riskScore = recentDetections.length > 0 ? 
      recentDetections.reduce((acc, det) => acc + det.risk_score, 0) / recentDetections.length : 0;

    res.json({
      success: true,
      profile: {
        userId,
        recentDetections,
        behaviorMetrics,
        riskScore,
        riskLevel: riskScore > 0.8 ? 'HIGH' : riskScore > 0.6 ? 'MEDIUM' : 'LOW'
      }
    });
  } catch (error) {
    console.error('Get risk profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get risk profile'
    });
  }
});

export default router;