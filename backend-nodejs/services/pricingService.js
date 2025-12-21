import { query } from '../config/database.js';

/**
 * Dynamic Pricing Engine for Car Rental System
 * Handles time-based, demand-based, distance-based, and seasonal pricing
 */

export class PricingService {
  /**
   * Calculate dynamic price for a car rental
   * @param {number} carId - Car ID
   * @param {string} startDate - Rental start date (YYYY-MM-DD)
   * @param {string} endDate - Rental end date (YYYY-MM-DD)
   * @param {string} pickupLocation - Pickup location
   * @param {string} dropoffLocation - Dropoff location
   * @returns {Object} Pricing breakdown
   */
  static async calculateDynamicPrice(carId, startDate, endDate, pickupLocation = null, dropoffLocation = null) {
    try {
      // Get base car price
      const carResult = await query('SELECT price_per_day FROM cars WHERE id = ?', [carId]);
      if (carResult.rows.length === 0) {
        throw new Error('Car not found');
      }

      const basePricePerDay = parseFloat(carResult.rows[0].price_per_day);

      // Calculate rental duration
      const start = new Date(startDate);
      const end = new Date(endDate);
      const durationInDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

      if (durationInDays <= 0) {
        throw new Error('Invalid date range');
      }

      let basePrice = basePricePerDay * durationInDays;
      let totalMultiplier = 1.0;
      let appliedRules = [];

      // Get active pricing rules
      const rulesResult = await query(`
        SELECT * FROM pricing_rules 
        WHERE active = TRUE 
        AND (valid_from IS NULL OR valid_from <= ?) 
        AND (valid_to IS NULL OR valid_to >= ?)
        ORDER BY priority ASC
      `, [startDate, endDate]);

      // Apply each pricing rule
      for (const rule of rulesResult.rows) {
        const ruleMultiplier = await this.evaluateRule(rule, {
          carId,
          startDate,
          endDate,
          pickupLocation,
          dropoffLocation,
          durationInDays
        });

        if (ruleMultiplier !== 1.0) {
          totalMultiplier *= ruleMultiplier;
          appliedRules.push({
            name: rule.name,
            type: rule.rule_type,
            multiplier: ruleMultiplier,
            description: rule.description
          });
        }
      }

      // Calculate demand-based pricing
      const demandMultiplier = await this.calculateDemandMultiplier(startDate, endDate);
      if (demandMultiplier !== 1.0) {
        totalMultiplier *= demandMultiplier;
        appliedRules.push({
          name: 'High Demand Period',
          type: 'demand_based',
          multiplier: demandMultiplier,
          description: 'Price adjusted based on booking demand'
        });
      }

      // Calculate distance-based pricing if locations provided
      let distanceMultiplier = 1.0;
      if (pickupLocation && dropoffLocation && pickupLocation !== dropoffLocation) {
        distanceMultiplier = await this.calculateDistanceMultiplier(pickupLocation, dropoffLocation);
        if (distanceMultiplier !== 1.0) {
          totalMultiplier *= distanceMultiplier;
          appliedRules.push({
            name: 'Distance Adjustment',
            type: 'distance_based',
            multiplier: distanceMultiplier,
            description: 'Price adjusted for delivery distance'
          });
        }
      }

      // Platform fee (5% of base price)
      const platformFee = basePrice * 0.05;

      // Insurance fee (10% of total price)
      const adjustedPrice = basePrice * totalMultiplier;
      const insuranceFee = adjustedPrice * 0.10;

      const totalPrice = adjustedPrice + platformFee + insuranceFee;

      return {
        basePrice: basePrice.toFixed(2),
        adjustedPrice: adjustedPrice.toFixed(2),
        totalPrice: totalPrice.toFixed(2),
        platformFee: platformFee.toFixed(2),
        insuranceFee: insuranceFee.toFixed(2),
        dynamicMultiplier: totalMultiplier.toFixed(2),
        durationInDays,
        appliedRules,
        breakdown: {
          basePricePerDay: basePricePerDay.toFixed(2),
          totalDays: durationInDays,
          multiplierApplied: totalMultiplier.toFixed(2),
          platformFeeRate: '5%',
          insuranceFeeRate: '10%'
        }
      };

    } catch (error) {
      console.error('❌ Pricing calculation error:', error);
      throw error;
    }
  }

  /**
   * Evaluate a specific pricing rule
   */
  static async evaluateRule(rule, context) {
    try {
      const conditions = JSON.parse(rule.conditions || '{}');

      switch (rule.rule_type) {
        case 'time_based':
          return this.evaluateTimeBasedRule(conditions, context);

        case 'seasonal':
          return this.evaluateSeasonalRule(conditions, context);

        case 'demand_based':
          // Handled separately in calculateDemandMultiplier
          return 1.0;

        case 'distance_based':
          // Handled separately in calculateDistanceMultiplier
          return 1.0;

        default:
          return 1.0;
      }
    } catch (error) {
      console.error('❌ Rule evaluation error:', error);
      return 1.0;
    }
  }

  /**
   * Evaluate time-based pricing rules (weekends, holidays, peak hours)
   */
  static evaluateTimeBasedRule(conditions, context) {
    const start = new Date(context.startDate);
    const dayOfWeek = start.getDay(); // 0 = Sunday, 6 = Saturday
    const month = start.getMonth() + 1; // 1-12

    // Weekend pricing
    if (conditions.weekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
      return conditions.weekendMultiplier || 1.2;
    }

    // Holiday periods
    if (conditions.holidays) {
      const holidays = conditions.holidays;
      for (const holiday of holidays) {
        const holidayStart = new Date(holiday.start);
        const holidayEnd = new Date(holiday.end);
        if (start >= holidayStart && start <= holidayEnd) {
          return holiday.multiplier || 1.5;
        }
      }
    }

    // Peak months (e.g., December, July)
    if (conditions.peakMonths && conditions.peakMonths.includes(month)) {
      return conditions.peakMonthMultiplier || 1.3;
    }

    return 1.0;
  }

  /**
   * Evaluate seasonal pricing rules
   */
  static evaluateSeasonalRule(conditions, context) {
    const start = new Date(context.startDate);
    const month = start.getMonth() + 1; // 1-12

    if (conditions.seasons) {
      for (const season of conditions.seasons) {
        if (month >= season.startMonth && month <= season.endMonth) {
          return season.multiplier || 1.0;
        }
      }
    }

    return 1.0;
  }

  /**
   * Calculate demand-based pricing multiplier
   */
  static async calculateDemandMultiplier(startDate, endDate) {
    try {
      // Count bookings in the same period
      const demandResult = await query(`
        SELECT COUNT(*) as bookingCount
        FROM bookings 
        WHERE (start_date <= ? AND end_date >= ?) 
        AND status IN ('confirmed', 'active')
      `, [endDate, startDate]);

      const bookingCount = demandResult.rows[0].bookingCount;

      // Apply multiplier based on demand
      if (bookingCount >= 20) return 1.5;  // Very high demand
      if (bookingCount >= 15) return 1.3;  // High demand
      if (bookingCount >= 10) return 1.2;  // Medium demand
      if (bookingCount >= 5) return 1.1;   // Low-medium demand

      return 1.0; // Normal demand
    } catch (error) {
      console.error('❌ Demand calculation error:', error);
      return 1.0;
    }
  }

  /**
   * Calculate distance-based pricing multiplier
   */
  static async calculateDistanceMultiplier(pickupLocation, dropoffLocation) {
    try {
      // Simple distance calculation based on location names
      // In a real app, you'd use Google Maps Distance Matrix API
      const distance = this.calculateSimpleDistance(pickupLocation, dropoffLocation);

      // Apply multiplier based on distance
      if (distance > 50) return 1.3;   // >50km
      if (distance > 30) return 1.2;   // 30-50km  
      if (distance > 15) return 1.1;   // 15-30km

      return 1.0; // <15km no extra charge
    } catch (error) {
      console.error('❌ Distance calculation error:', error);
      return 1.0;
    }
  }

  /**
   * Simple distance calculation (placeholder for real distance API)
   */
  static calculateSimpleDistance(location1, location2) {
    // This is a placeholder - in production, use Google Maps API
    const distances = {
      'Nairobi CBD': { 'Westlands': 8, 'Karen': 18, 'Kiambu': 25 },
      'Westlands': { 'Nairobi CBD': 8, 'Karen': 25, 'Kiambu': 30 },
      'Karen': { 'Nairobi CBD': 18, 'Westlands': 25, 'Kiambu': 40 }
    };

    if (distances[location1] && distances[location1][location2]) {
      return distances[location1][location2];
    }

    // Default distance for unknown locations
    return 15;
  }

  /**
   * Create a new pricing rule
   */
  static async createPricingRule(ruleData) {
    try {
      const result = await query(`
        INSERT INTO pricing_rules (name, description, rule_type, conditions, multiplier, priority, active, valid_from, valid_to)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        ruleData.name,
        ruleData.description,
        ruleData.rule_type,
        JSON.stringify(ruleData.conditions),
        ruleData.multiplier,
        ruleData.priority || 1,
        ruleData.active !== false,
        ruleData.valid_from || null,
        ruleData.valid_to || null
      ]);

      return { id: result.insertId, success: true };
    } catch (error) {
      console.error('❌ Create pricing rule error:', error);
      throw error;
    }
  }

  /**
   * Get all pricing rules
   */
  static async getPricingRules() {
    try {
      const result = await query(`
        SELECT * FROM pricing_rules 
        ORDER BY priority ASC, created_at DESC
      `);

      return result.rows.map(rule => ({
        ...rule,
        conditions: JSON.parse(rule.conditions || '{}')
      }));
    } catch (error) {
      console.error('❌ Get pricing rules error:', error);
      throw error;
    }
  }

  /**
   * Update a pricing rule
   */
  static async updatePricingRule(id, updateData) {
    try {
      const result = await query(`
        UPDATE pricing_rules 
        SET name = ?, description = ?, rule_type = ?, conditions = ?, 
            multiplier = ?, priority = ?, active = ?, valid_from = ?, valid_to = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        updateData.name,
        updateData.description,
        updateData.rule_type,
        JSON.stringify(updateData.conditions),
        updateData.multiplier,
        updateData.priority,
        updateData.active,
        updateData.valid_from,
        updateData.valid_to,
        id
      ]);

      return { success: result.rowCount > 0 };
    } catch (error) {
      console.error('❌ Update pricing rule error:', error);
      throw error;
    }
  }

  /**
   * Delete a pricing rule
   */
  static async deletePricingRule(id) {
    try {
      const result = await query('DELETE FROM pricing_rules WHERE id = ?', [id]);
      return { success: result.rowCount > 0 };
    } catch (error) {
      console.error('❌ Delete pricing rule error:', error);
      throw error;
    }
  }
}

// Default pricing rules to seed the system
export const defaultPricingRules = [
  {
    name: 'Weekend Premium',
    description: 'Higher rates for weekend bookings',
    rule_type: 'time_based',
    conditions: {
      weekends: true,
      weekendMultiplier: 1.25
    },
    multiplier: 1.25,
    priority: 1,
    active: true
  },
  {
    name: 'Holiday Season',
    description: 'Premium rates during holiday periods',
    rule_type: 'time_based',
    conditions: {
      holidays: [
        { start: '2024-12-20', end: '2024-01-05', multiplier: 1.5 },
        { start: '2024-07-01', end: '2024-08-31', multiplier: 1.3 }
      ]
    },
    multiplier: 1.5,
    priority: 2,
    active: true
  },
  {
    name: 'Peak Season',
    description: 'Higher rates during tourist season',
    rule_type: 'seasonal',
    conditions: {
      seasons: [
        { startMonth: 12, endMonth: 2, multiplier: 1.4 },
        { startMonth: 6, endMonth: 8, multiplier: 1.2 }
      ]
    },
    multiplier: 1.4,
    priority: 3,
    active: true
  }
];

export default PricingService;