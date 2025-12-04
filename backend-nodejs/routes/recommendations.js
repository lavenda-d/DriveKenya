import express from 'express';
import { default as RecommendationEngine } from '../services/recommendationEngine.js';
const router = express.Router();

const recommendationEngine = new RecommendationEngine();

// Get personalized recommendations
router.post('/', async (req, res) => {
  try {
    const { userId, context = {}, filter = 'all', limit = 10 } = req.body;
    
    const recommendations = await recommendationEngine.getRecommendations(
      userId || req.user.id,
      context,
      req.db,
      limit
    );

    res.json({
      success: true,
      recommendations,
      filter,
      count: recommendations.length
    });
  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate recommendations'
    });
  }
});

// Record user feedback for machine learning
router.post('/feedback', async (req, res) => {
  try {
    const { carId, feedback } = req.body;
    const userId = req.user.id;

    // Store feedback for ML training
    await req.db.run(`
      INSERT INTO recommendation_feedback (
        user_id, car_id, feedback, created_at
      ) VALUES (?, ?, ?, ?)
    `, [userId, carId, feedback, new Date().toISOString()]);

    res.json({
      success: true,
      message: 'Feedback recorded'
    });
  } catch (error) {
    console.error('Feedback recording error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record feedback'
    });
  }
});

// Get recommendation analytics (admin only)
router.get('/analytics', async (req, res) => {
  try {
    const analytics = await req.db.get(`
      SELECT 
        COUNT(*) as total_recommendations,
        COUNT(DISTINCT user_id) as unique_users,
        AVG(score) as avg_score
      FROM recommendation_feedback
      WHERE created_at > datetime('now', '-30 days')
    `);

    const topRecommendedCars = await req.db.all(`
      SELECT 
        c.id, c.make, c.model, COUNT(*) as recommendation_count
      FROM recommendation_feedback rf
      JOIN cars c ON rf.car_id = c.id
      WHERE rf.created_at > datetime('now', '-30 days')
      GROUP BY c.id
      ORDER BY recommendation_count DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      analytics,
      topRecommendedCars
    });
  } catch (error) {
    console.error('Recommendation analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics'
    });
  }
});

export default router;