import express from 'express';
import { PricingService, defaultPricingRules } from '../services/pricingService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * Calculate dynamic pricing for a rental
 * POST /api/pricing/calculate
 */
router.post('/calculate', async (req, res) => {
  try {
    const { carId, startDate, endDate, pickupLocation, dropoffLocation } = req.body;

    // Validate required fields
    if (!carId || !startDate || !endDate) {
      return res.status(400).json({
        error: 'Missing required fields: carId, startDate, endDate'
      });
    }

    const pricing = await PricingService.calculateDynamicPrice(
      carId,
      startDate,
      endDate,
      pickupLocation,
      dropoffLocation
    );

    res.json({
      success: true,
      pricing
    });
  } catch (error) {
    console.error('❌ Pricing calculation error:', error);
    res.status(500).json({
      error: 'Failed to calculate pricing',
      details: error.message
    });
  }
});

/**
 * Get all pricing rules (Admin only)
 * GET /api/pricing/rules
 */
router.get('/rules', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const rules = await PricingService.getPricingRules();

    res.json({
      success: true,
      rules
    });
  } catch (error) {
    console.error('❌ Get pricing rules error:', error);
    res.status(500).json({
      error: 'Failed to fetch pricing rules',
      details: error.message
    });
  }
});

/**
 * Create a new pricing rule (Admin only)
 * POST /api/pricing/rules
 */
router.post('/rules', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const {
      name,
      description,
      rule_type,
      conditions,
      multiplier,
      priority,
      active,
      valid_from,
      valid_to
    } = req.body;

    // Validate required fields
    if (!name || !rule_type || !multiplier) {
      return res.status(400).json({
        error: 'Missing required fields: name, rule_type, multiplier'
      });
    }

    // Validate rule type
    const validTypes = ['time_based', 'demand_based', 'distance_based', 'seasonal'];
    if (!validTypes.includes(rule_type)) {
      return res.status(400).json({
        error: 'Invalid rule_type. Must be one of: ' + validTypes.join(', ')
      });
    }

    // Validate multiplier
    if (isNaN(multiplier) || multiplier <= 0) {
      return res.status(400).json({
        error: 'Multiplier must be a positive number'
      });
    }

    const result = await PricingService.createPricingRule({
      name,
      description,
      rule_type,
      conditions,
      multiplier: parseFloat(multiplier),
      priority: priority || 1,
      active: active !== false,
      valid_from,
      valid_to
    });

    res.status(201).json({
      success: true,
      message: 'Pricing rule created successfully',
      ruleId: result.id
    });
  } catch (error) {
    console.error('❌ Create pricing rule error:', error);
    res.status(500).json({
      error: 'Failed to create pricing rule',
      details: error.message
    });
  }
});

/**
 * Update a pricing rule (Admin only)
 * PUT /api/pricing/rules/:id
 */
router.put('/rules/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const updateData = req.body;

    // Validate ID
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid rule ID' });
    }

    // Validate multiplier if provided
    if (updateData.multiplier && (isNaN(updateData.multiplier) || updateData.multiplier <= 0)) {
      return res.status(400).json({
        error: 'Multiplier must be a positive number'
      });
    }

    const result = await PricingService.updatePricingRule(parseInt(id), updateData);

    if (!result.success) {
      return res.status(404).json({ error: 'Pricing rule not found' });
    }

    res.json({
      success: true,
      message: 'Pricing rule updated successfully'
    });
  } catch (error) {
    console.error('❌ Update pricing rule error:', error);
    res.status(500).json({
      error: 'Failed to update pricing rule',
      details: error.message
    });
  }
});

/**
 * Delete a pricing rule (Admin only)
 * DELETE /api/pricing/rules/:id
 */
router.delete('/rules/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    // Validate ID
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid rule ID' });
    }

    const result = await PricingService.deletePricingRule(parseInt(id));

    if (!result.success) {
      return res.status(404).json({ error: 'Pricing rule not found' });
    }

    res.json({
      success: true,
      message: 'Pricing rule deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete pricing rule error:', error);
    res.status(500).json({
      error: 'Failed to delete pricing rule',
      details: error.message
    });
  }
});

/**
 * Initialize default pricing rules (Admin only)
 * POST /api/pricing/rules/initialize
 */
router.post('/rules/initialize', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const createdRules = [];

    for (const rule of defaultPricingRules) {
      try {
        const result = await PricingService.createPricingRule(rule);
        createdRules.push({ ...rule, id: result.id });
      } catch (error) {
        // Skip if rule already exists
        console.log('Skipping existing rule:', rule.name);
      }
    }

    res.json({
      success: true,
      message: 'Default pricing rules initialized',
      createdCount: createdRules.length,
      rules: createdRules
    });
  } catch (error) {
    console.error('❌ Initialize pricing rules error:', error);
    res.status(500).json({
      error: 'Failed to initialize pricing rules',
      details: error.message
    });
  }
});

/**
 * Get pricing preview (for customers)
 * POST /api/pricing/preview
 */
router.post('/preview', async (req, res) => {
  try {
    const { carId, startDate, endDate, pickupLocation, dropoffLocation } = req.body;

    // Validate required fields
    if (!carId || !startDate || !endDate) {
      return res.status(400).json({
        error: 'Missing required fields: carId, startDate, endDate'
      });
    }

    const pricing = await PricingService.calculateDynamicPrice(
      carId,
      startDate,
      endDate,
      pickupLocation,
      dropoffLocation
    );

    // Return simplified preview for customers
    res.json({
      success: true,
      preview: {
        basePrice: pricing.basePrice,
        totalPrice: pricing.totalPrice,
        platformFee: pricing.platformFee,
        insuranceFee: pricing.insuranceFee,
        durationInDays: pricing.durationInDays,
        savings: pricing.appliedRules.some(r => r.multiplier < 1.0),
        surcharge: pricing.appliedRules.some(r => r.multiplier > 1.0),
        breakdown: pricing.breakdown
      }
    });
  } catch (error) {
    console.error('❌ Pricing preview error:', error);
    res.status(500).json({
      error: 'Failed to generate pricing preview',
      details: error.message
    });
  }
});

/**
 * Get pricing analytics (Admin only)
 * GET /api/pricing/analytics
 */
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { startDate, endDate } = req.query;

    // Default to last 30 days if no dates provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get pricing analytics from bookings
    const { query } = await import('../config/database.js');

    const analyticsResult = await query(`
      SELECT 
        COUNT(*) as totalBookings,
        AVG(dynamic_pricing_multiplier) as avgMultiplier,
        SUM(base_price) as totalBasePrice,
        SUM(total_price) as totalRevenue,
        SUM(platform_fee) as totalPlatformFees,
        MIN(dynamic_pricing_multiplier) as minMultiplier,
        MAX(dynamic_pricing_multiplier) as maxMultiplier
      FROM bookings 
      WHERE created_at >= ? AND created_at <= ?
    `, [start.toISOString(), end.toISOString()]);

    // Get most applied pricing adjustments
    const rulesAnalytics = await query(`
      SELECT 
        CASE 
          WHEN dynamic_pricing_multiplier > 1.5 THEN 'High Premium'
          WHEN dynamic_pricing_multiplier > 1.2 THEN 'Medium Premium'
          WHEN dynamic_pricing_multiplier > 1.0 THEN 'Low Premium'
          WHEN dynamic_pricing_multiplier = 1.0 THEN 'Standard Rate'
          ELSE 'Discount Applied'
        END as priceCategory,
        COUNT(*) as bookingCount,
        AVG(dynamic_pricing_multiplier) as avgMultiplier
      FROM bookings 
      WHERE created_at >= ? AND created_at <= ?
      GROUP BY priceCategory
      ORDER BY bookingCount DESC
    `, [start.toISOString(), end.toISOString()]);

    const analytics = analyticsResult.rows[0];

    res.json({
      success: true,
      analytics: {
        period: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
        },
        overview: {
          totalBookings: analytics.totalBookings || 0,
          averageMultiplier: parseFloat(analytics.avgMultiplier || 1.0).toFixed(2),
          totalBasePrice: parseFloat(analytics.totalBasePrice || 0).toFixed(2),
          totalRevenue: parseFloat(analytics.totalRevenue || 0).toFixed(2),
          totalPlatformFees: parseFloat(analytics.totalPlatformFees || 0).toFixed(2),
          pricingRange: {
            min: parseFloat(analytics.minMultiplier || 1.0).toFixed(2),
            max: parseFloat(analytics.maxMultiplier || 1.0).toFixed(2)
          }
        },
        priceDistribution: rulesAnalytics.rows
      }
    });
  } catch (error) {
    console.error('❌ Pricing analytics error:', error);
    res.status(500).json({
      error: 'Failed to fetch pricing analytics',
      details: error.message
    });
  }
});

export default router;