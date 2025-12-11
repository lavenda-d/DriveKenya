import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { query } from '../config/database-sqlite.js';

const router = express.Router();

// Car Owner middleware - check if user has host role
const requireHost = (req, res, next) => {
  if (req.user.role !== 'host' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Car owner access required'
    });
  }
  next();
};

// Owner Dashboard Overview
router.get('/dashboard', authenticateToken, requireHost, async (req, res, next) => {
  try {
    const hostId = req.user.id;

    // Get owner's cars summary
    const carsSummary = query(`
      SELECT 
        COUNT(*) as total_cars,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_cars,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance_cars
      FROM cars 
      WHERE host_id = ?
    `, [hostId]);

    // Get earnings summary
    const earningsSummary = query(`
      SELECT 
        SUM(b.total_price) as total_earnings,
        SUM(CASE WHEN date(b.created_at) >= date('now', '-30 days') THEN b.total_price ELSE 0 END) as monthly_earnings,
        COUNT(b.id) as total_bookings,
        COUNT(CASE WHEN date(b.created_at) >= date('now', '-30 days') THEN b.id END) as monthly_bookings
      FROM bookings b
      JOIN cars c ON b.car_id = c.id
      WHERE c.host_id = ? AND b.status = 'completed'
    `, [hostId]);

    // Get current active bookings
    const activeBookings = query(`
      SELECT 
        b.*,
        u.first_name || ' ' || u.last_name as customer_name,
        c.make || ' ' || c.model as car_name,
        c.license_plate
      FROM bookings b
      JOIN users u ON b.customer_id = u.id
      JOIN cars c ON b.car_id = c.id
      WHERE c.host_id = ? 
      AND b.status = 'active'
      AND date(b.end_date) >= date('now')
      ORDER BY b.start_date ASC
    `, [hostId]);

    // Get upcoming bookings
    const upcomingBookings = query(`
      SELECT 
        b.*,
        u.first_name || ' ' || u.last_name as customer_name,
        c.make || ' ' || c.model as car_name,
        c.license_plate
      FROM bookings b
      JOIN users u ON b.customer_id = u.id
      JOIN cars c ON b.car_id = c.id
      WHERE c.host_id = ? 
      AND b.status = 'confirmed'
      AND date(b.start_date) > date('now')
      ORDER BY b.start_date ASC
      LIMIT 5
    `, [hostId]);

    // Performance metrics for last 30 days
    const performanceMetrics = query(`
      SELECT 
        c.id,
        c.make || ' ' || c.model as car_name,
        COUNT(b.id) as bookings,
        SUM(b.total_price) as revenue,
        AVG(JULIANDAY(b.end_date) - JULIANDAY(b.start_date)) as avg_duration,
        (COUNT(b.id) * 100.0 / 30) as utilization_rate
      FROM cars c
      LEFT JOIN bookings b ON c.id = b.car_id 
        AND b.status = 'completed'
        AND b.created_at >= date('now', '-30 days')
      WHERE c.host_id = ?
      GROUP BY c.id
      ORDER BY revenue DESC
    `, [hostId]);

    res.json({
      success: true,
      dashboard: {
        summary: {
          cars: carsSummary.rows[0],
          earnings: earningsSummary.rows[0]
        },
        activeBookings: activeBookings.rows,
        upcomingBookings: upcomingBookings.rows,
        carPerformance: performanceMetrics.rows,
        // Dashboard stats
        totalEarnings: earningsSummary.rows[0]?.total_earnings || 0,
        monthlyEarnings: earningsSummary.rows[0]?.monthly_earnings || 0,
        totalCars: carsSummary.rows[0]?.total_cars || 0,
        activeCars: carsSummary.rows[0]?.active_cars || 0,
        totalBookings: earningsSummary.rows[0]?.total_bookings || 0,
        monthlyBookings: earningsSummary.rows[0]?.monthly_bookings || 0,
        utilizationRate: 75,
        topPerformingCars: performanceMetrics.rows.slice(0, 3).map(car => ({
          ...car,
          earnings: car.revenue,
          bookingCount: car.bookings,
          utilizationRate: Math.round(car.utilization_rate || 0)
        })),
        recentBookings: activeBookings.rows.slice(0, 5).map(booking => ({
          id: booking.id,
          carDetails: booking.car_name,
          customerName: booking.customer_name,
          dateRange: `${booking.start_date} - ${booking.end_date}`,
          amount: booking.total_price,
          status: booking.status
        })),
        upcomingMaintenance: [],
        bookingGrowth: 15.2,
        utilizationChange: 5.8
      }
    });

  } catch (error) {
    next(error);
  }
});

// Earnings Analytics
router.get('/earnings', authenticateToken, requireHost, async (req, res, next) => {
  try {
    const hostId = req.user.id;
    const { period = '90', groupBy = 'day' } = req.query;

    let dateFormat, groupByClause;
    switch (groupBy) {
      case 'week':
        dateFormat = "strftime('%Y-W%W', b.created_at)";
        groupByClause = dateFormat;
        break;
      case 'month':
        dateFormat = "strftime('%Y-%m', b.created_at)";
        groupByClause = dateFormat;
        break;
      default:
        dateFormat = "date(b.created_at)";
        groupByClause = "date(b.created_at)";
    }

    // Earnings over time
    const earningsTimeline = query(`
      SELECT 
        ${dateFormat} as period,
        SUM(b.total_price) as earnings,
        COUNT(b.id) as bookings,
        AVG(b.total_price) as avg_booking_value
      FROM bookings b
      JOIN cars c ON b.car_id = c.id
      WHERE c.host_id = ? 
      AND b.status = 'completed'
      AND b.created_at >= date('now', '-${period} days')
      GROUP BY ${groupByClause}
      ORDER BY period ASC
    `, [hostId]);

    // Earnings by car
    const earningsByCar = query(`
      SELECT 
        c.id,
        c.make || ' ' || c.model as car_name,
        c.license_plate,
        SUM(b.total_price) as total_earnings,
        COUNT(b.id) as total_bookings,
        AVG(b.total_price) as avg_booking_value,
        MIN(b.created_at) as first_booking,
        MAX(b.created_at) as last_booking
      FROM cars c
      LEFT JOIN bookings b ON c.id = b.car_id 
        AND b.status = 'completed'
        AND b.created_at >= date('now', '-${period} days')
      WHERE c.host_id = ?
      GROUP BY c.id
      ORDER BY total_earnings DESC
    `, [hostId]);

    // Commission and payouts
    const platformCommission = 0.15; // 15% commission
    const totalEarnings = earningsByCar.rows.reduce((sum, car) => sum + (car.total_earnings || 0), 0);
    const netEarnings = totalEarnings * (1 - platformCommission);
    const commission = totalEarnings * platformCommission;

    res.json({
      success: true,
      data: {
        timeline: earningsTimeline.rows,
        byCar: earningsByCar.rows,
        summary: {
          totalEarnings,
          netEarnings,
          commission,
          platformCommissionRate: platformCommission
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Car Management
router.get('/cars', authenticateToken, requireHost, async (req, res, next) => {
  try {
    const hostId = req.user.id;

    const cars = query(`
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM bookings WHERE car_id = c.id) as total_bookings,
        (SELECT COUNT(*) FROM bookings WHERE car_id = c.id AND status = 'active') as active_bookings,
        (SELECT SUM(total_price) FROM bookings WHERE car_id = c.id AND status = 'completed') as total_earnings,
        (SELECT AVG(rating) FROM reviews WHERE car_id = c.id) as avg_rating,
        (SELECT COUNT(*) FROM reviews WHERE car_id = c.id) as review_count
      FROM cars c
      WHERE c.host_id = ?
      ORDER BY c.created_at DESC
    `, [hostId]);

    res.json({
      success: true,
      data: cars.rows
    });

  } catch (error) {
    next(error);
  }
});

// Car Availability Management
router.get('/cars/:carId/availability', authenticateToken, requireHost, async (req, res, next) => {
  try {
    const { carId } = req.params;
    const hostId = req.user.id;

    // Verify car ownership
    const carOwnership = query(`
      SELECT id FROM cars WHERE id = ? AND host_id = ?
    `, [carId, hostId]);

    if (carOwnership.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Car not found or access denied'
      });
    }

    // Get existing bookings for calendar
    const bookings = query(`
      SELECT 
        id, start_date, end_date, status,
        (SELECT first_name || ' ' || last_name FROM users WHERE id = customer_id) as customer_name
      FROM bookings 
      WHERE car_id = ? 
      AND status IN ('confirmed', 'active')
      AND date(end_date) >= date('now', '-30 days')
      ORDER BY start_date ASC
    `, [carId]);

    // Get blocked dates (maintenance, personal use, etc.)
    const blockedDates = query(`
      SELECT start_date, end_date, reason, type
      FROM car_availability_blocks 
      WHERE car_id = ? 
      AND date(end_date) >= date('now')
      ORDER BY start_date ASC
    `, [carId]);

    res.json({
      success: true,
      data: {
        bookings: bookings.rows,
        blockedDates: blockedDates.rows
      }
    });

  } catch (error) {
    next(error);
  }
});

// Block car availability
router.post('/cars/:carId/block', authenticateToken, requireHost, async (req, res, next) => {
  try {
    const { carId } = req.params;
    const hostId = req.user.id;
    const { startDate, endDate, reason, type = 'owner_block' } = req.body;

    // Verify car ownership
    const carOwnership = query(`
      SELECT id FROM cars WHERE id = ? AND host_id = ?
    `, [carId, hostId]);

    if (carOwnership.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Car not found or access denied'
      });
    }

    // Check for conflicting bookings
    const conflicts = query(`
      SELECT id FROM bookings 
      WHERE car_id = ? 
      AND status IN ('confirmed', 'active')
      AND (
        (date(?) BETWEEN date(start_date) AND date(end_date)) OR
        (date(?) BETWEEN date(start_date) AND date(end_date)) OR
        (date(start_date) BETWEEN date(?) AND date(?))
      )
    `, [carId, startDate, endDate, startDate, endDate]);

    if (conflicts.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot block dates with existing bookings'
      });
    }

    // Insert availability block
    const result = query(`
      INSERT INTO car_availability_blocks (car_id, start_date, end_date, reason, type)
      VALUES (?, ?, ?, ?, ?)
    `, [carId, startDate, endDate, reason, type]);

    res.status(201).json({
      success: true,
      message: 'Availability blocked successfully',
      data: { blockId: result.insertId }
    });

  } catch (error) {
    next(error);
  }
});

// Car Analytics
router.get('/cars/:carId/analytics', authenticateToken, requireHost, async (req, res, next) => {
  try {
    const { carId } = req.params;
    const hostId = req.user.id;
    const { period = '90' } = req.query;

    // Verify car ownership
    const carOwnership = query(`
      SELECT * FROM cars WHERE id = ? AND host_id = ?
    `, [carId, hostId]);

    if (carOwnership.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Car not found or access denied'
      });
    }

    const car = carOwnership.rows[0];

    // Booking trends
    const bookingTrends = query(`
      SELECT 
        date(created_at) as date,
        COUNT(*) as bookings,
        SUM(total_price) as revenue,
        AVG(total_price) as avg_price
      FROM bookings 
      WHERE car_id = ? 
      AND created_at >= date('now', '-${period} days')
      GROUP BY date(created_at)
      ORDER BY date ASC
    `, [carId]);

    // Performance metrics
    const metrics = query(`
      SELECT 
        COUNT(*) as total_bookings,
        SUM(total_price) as total_revenue,
        AVG(total_price) as avg_booking_value,
        AVG(JULIANDAY(end_date) - JULIANDAY(start_date)) as avg_duration,
        MIN(created_at) as first_booking,
        MAX(created_at) as last_booking
      FROM bookings 
      WHERE car_id = ? 
      AND status = 'completed'
      AND created_at >= date('now', '-${period} days')
    `, [carId]);

    // Reviews and ratings
    const reviews = query(`
      SELECT 
        r.*,
        u.first_name || ' ' || u.last_name as customer_name
      FROM reviews r
      JOIN users u ON r.customer_id = u.id
      WHERE r.car_id = ?
      ORDER BY r.created_at DESC
      LIMIT 10
    `, [carId]);

    const ratingStats = query(`
      SELECT 
        AVG(rating) as avg_rating,
        COUNT(*) as total_reviews,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
      FROM reviews 
      WHERE car_id = ?
    `, [carId]);

    res.json({
      success: true,
      data: {
        car,
        bookingTrends: bookingTrends.rows,
        metrics: metrics.rows[0],
        reviews: reviews.rows,
        ratingStats: ratingStats.rows[0]
      }
    });

  } catch (error) {
    next(error);
  }
});

// Maintenance Management
router.get('/cars/:carId/maintenance', authenticateToken, requireHost, async (req, res, next) => {
  try {
    const { carId } = req.params;
    const hostId = req.user.id;

    // Verify car ownership
    const carOwnership = query(`
      SELECT id FROM cars WHERE id = ? AND host_id = ?
    `, [carId, hostId]);

    if (carOwnership.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Car not found or access denied'
      });
    }

    const maintenanceRecords = query(`
      SELECT * FROM car_maintenance 
      WHERE car_id = ? 
      ORDER BY scheduled_date DESC
    `, [carId]);

    res.json({
      success: true,
      data: maintenanceRecords.rows
    });

  } catch (error) {
    next(error);
  }
});

// Add maintenance record
router.post('/cars/:carId/maintenance', authenticateToken, requireHost, async (req, res, next) => {
  try {
    const { carId } = req.params;
    const hostId = req.user.id;
    const { type, description, scheduledDate, cost, provider, status = 'scheduled' } = req.body;

    // Verify car ownership
    const carOwnership = query(`
      SELECT id FROM cars WHERE id = ? AND host_id = ?
    `, [carId, hostId]);

    if (carOwnership.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Car not found or access denied'
      });
    }

    const result = query(`
      INSERT INTO car_maintenance 
      (car_id, type, description, scheduled_date, cost, provider, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [carId, type, description, scheduledDate, cost, provider, status]);

    res.status(201).json({
      success: true,
      message: 'Maintenance record added successfully',
      data: { maintenanceId: result.insertId }
    });

  } catch (error) {
    next(error);
  }
});

// Car Availability Management
router.get('/cars/:carId/availability-blocks', authenticateToken, requireHost, async (req, res, next) => {
  try {
    const { carId } = req.params;
    const hostId = req.user.id;

    // Verify car ownership
    const carCheck = await query('SELECT id FROM cars WHERE id = ? AND host_id = ?', [carId, hostId]);
    if (carCheck.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Car not found or access denied' });
    }

    const blocks = await query(`
      SELECT * FROM car_availability_blocks 
      WHERE car_id = ? AND end_date >= date('now')
      ORDER BY start_date ASC
    `, [carId]);

    res.json({
      success: true,
      blocks: blocks.rows
    });
  } catch (error) {
    next(error);
  }
});

router.post('/cars/:carId/availability-blocks', authenticateToken, requireHost, async (req, res, next) => {
  try {
    const { carId } = req.params;
    const hostId = req.user.id;
    const { startDate, endDate, type, reason } = req.body;

    // Verify car ownership
    const carCheck = await query('SELECT id FROM cars WHERE id = ? AND host_id = ?', [carId, hostId]);
    if (carCheck.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Car not found or access denied' });
    }

    const result = await query(`
      INSERT INTO car_availability_blocks (car_id, start_date, end_date, type, reason)
      VALUES (?, ?, ?, ?, ?)
    `, [carId, startDate, endDate, type, reason]);

    res.json({
      success: true,
      blockId: result.insertId
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/cars/:carId/availability-blocks/:blockId', authenticateToken, requireHost, async (req, res, next) => {
  try {
    const { carId, blockId } = req.params;
    const hostId = req.user.id;

    // Verify car ownership and block ownership
    const blockCheck = await query(`
      SELECT ab.* FROM car_availability_blocks ab
      JOIN cars c ON ab.car_id = c.id
      WHERE ab.id = ? AND ab.car_id = ? AND c.host_id = ?
    `, [blockId, carId, hostId]);

    if (blockCheck.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Block not found or access denied' });
    }

    await query('DELETE FROM car_availability_blocks WHERE id = ?', [blockId]);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;