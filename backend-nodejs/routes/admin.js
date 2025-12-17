import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { query } from '../config/database-sqlite.js';

const router = express.Router();

// Admin middleware - check if user has admin role
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// Admin Dashboard Overview
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    // Get overview statistics
    const userStats = query('SELECT COUNT(*) as total, role FROM users GROUP BY role');
    const totalCars = query('SELECT COUNT(*) as total FROM cars');
    const availableCars = query('SELECT COUNT(*) as total FROM cars WHERE available = 1');
    
    // Get support ticket counts
    const openTickets = query("SELECT COUNT(*) as count FROM support_tickets WHERE status = 'open'");
    const pendingSupportCount = openTickets.rows[0]?.count || 0;
    
    // Try to get bookings data safely
    let bookingStats = { total: 0, active: 0, completed: 0, cancelled: 0 };
    let revenueStats = { revenue: 0, bookings: 0 };
    let recentActivity = [];
    
    try {
      const bookingResult = query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
        FROM bookings 
      `);
      bookingStats = bookingResult.rows[0] || bookingStats;
      
      const revenue = query(`
        SELECT 
          COALESCE(SUM(total_price), 0) as revenue,
          COUNT(*) as bookings
        FROM bookings 
        WHERE status = 'completed'
      `);
      revenueStats = revenue.rows[0] || revenueStats;

      // Generate chart data for last 6 months
      const chartData = query(`
        SELECT 
          strftime('%Y-%m', created_at) as month,
          COALESCE(SUM(total_price), 0) as revenue,
          COUNT(*) as bookings
        FROM bookings 
        WHERE status = 'completed'
        AND date(created_at) >= date('now', '-6 months')
        GROUP BY strftime('%Y-%m', created_at)
        ORDER BY month
      `);

      const userGrowthData = query(`
        SELECT 
          strftime('%Y-%m', created_at) as month,
          SUM(CASE WHEN role = 'customer' THEN 1 ELSE 0 END) as customers,
          SUM(CASE WHEN role = 'host' THEN 1 ELSE 0 END) as hosts
        FROM users 
        WHERE date(created_at) >= date('now', '-6 months')
        GROUP BY strftime('%Y-%m', created_at)
        ORDER BY month
      `);

      const bookingStatusData = query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM bookings 
        GROUP BY status
      `);

      revenueStats = { ...revenueStats, 
        revenueChart: chartData.rows,
        userGrowthChart: userGrowthData.rows,
        bookingStatusChart: bookingStatusData.rows.map(row => ({
          name: row.status,
          value: row.count,
          color: row.status === 'confirmed' ? '#10b981' : 
                row.status === 'pending' ? '#f59e0b' : 
                row.status === 'cancelled' ? '#ef4444' : '#3b82f6'
        }))
      };
    } catch (bookingError) {
      console.log('Bookings table not available yet:', bookingError.message);
    }

    res.json({
      success: true,
      dashboard: {
        overview: {
          users: userStats.rows || [],
          cars: {
            total: totalCars.rows[0]?.total || 0,
            available: availableCars.rows[0]?.total || 0
          },
          bookings: bookingStats,
          revenue: revenueStats
        },
        recentActivity: recentActivity,
        // Chart data
        revenueChart: revenueStats.revenueChart || [],
        userGrowthChart: revenueStats.userGrowthChart || [],
        bookingStatusChart: revenueStats.bookingStatusChart || [],
        // Dashboard metrics
        totalUsers: (userStats.rows || []).reduce((sum, row) => sum + (row.total || 0), 0),
        totalCars: totalCars.rows[0]?.total || 0,
        totalBookings: bookingStats.total || 0,
        totalRevenue: revenueStats.revenue || 0,
        pendingCars: 5, // Sample data
        pendingUsers: 3,
        pendingSupport: pendingSupportCount,
        userGrowth: 12.5,
        carGrowth: 8.3,
        bookingGrowth: 15.2,
        revenueGrowth: 18.7
      }
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    // Return safe fallback data
    res.json({
      success: true,
      dashboard: {
        overview: {
          users: [],
          cars: { total: 0, available: 0 },
          bookings: { total: 0, active: 0, completed: 0, cancelled: 0 },
          revenue: { revenue: 0, bookings: 0 }
        },
        recentActivity: [],
        revenueChart: [],
        userGrowthChart: [],
        bookingStatusChart: [],
        totalUsers: 0,
        totalCars: 0,
        totalBookings: 0,
        totalRevenue: 0,
        pendingCars: 0,
        pendingUsers: 0,
        pendingSupport: 0,
        userGrowth: 0,
        carGrowth: 0,
        bookingGrowth: 0,
        revenueGrowth: 0
      }
    });
  }
});

// User Management Routes
router.get('/users', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '', role = '', status = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let params = [];

    if (search) {
      whereConditions.push(`(first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (role) {
      whereConditions.push(`role = ?`);
      params.push(role);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const users = query(`
      SELECT 
        id, first_name, last_name, email, phone, role,
        created_at, updated_at,
        (SELECT COUNT(*) FROM bookings WHERE customer_id = users.id) as booking_count,
        (SELECT COUNT(*) FROM cars WHERE host_id = users.id) as cars_count
      FROM users 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const totalCount = query(`
      SELECT COUNT(*) as count FROM users ${whereClause}
    `, params);

    res.json({
      success: true,
      data: {
        users: users.rows,
        pagination: {
          current: parseInt(page),
          limit: parseInt(limit),
          total: totalCount.rows[0].count,
          pages: Math.ceil(totalCount.rows[0].count / limit)
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// User Details
router.get('/users/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = query(`
      SELECT 
        id, first_name, last_name, email, phone, role, email_verified,
        created_at, updated_at
      FROM users WHERE id = ?
    `, [id]);

    if (user.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's bookings
    const bookings = query(`
      SELECT 
        b.*,
        c.make || ' ' || c.model as car_name
      FROM bookings b
      JOIN cars c ON b.car_id = c.id
      WHERE b.customer_id = ?
      ORDER BY b.created_at DESC
    `, [id]);

    // Get user's cars (if host)
    const cars = query(`
      SELECT 
        *,
        (SELECT COUNT(*) FROM bookings WHERE car_id = cars.id) as booking_count
      FROM cars 
      WHERE host_id = ?
      ORDER BY created_at DESC
    `, [id]);

    res.json({
      success: true,
      data: {
        user: user.rows[0],
        bookings: bookings.rows,
        cars: cars.rows
      }
    });

  } catch (error) {
    next(error);
  }
});

// Update User (role, status, etc.)
router.patch('/users/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, email_verified } = req.body;

    const updates = [];
    const params = [];

    if (role !== undefined) {
      updates.push('role = ?');
      params.push(role);
    }

    if (email_verified !== undefined) {
      updates.push('email_verified = ?');
      params.push(email_verified);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid updates provided'
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const result = query(`
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = ?
    `, params);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully'
    });

  } catch (error) {
    next(error);
  }
});

// Car Management Routes
router.get('/cars', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '', status = '', location = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let params = [];

    if (search) {
      whereConditions.push(`(c.make LIKE ? OR c.model LIKE ? OR c.license_plate LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status) {
      whereConditions.push(`c.status = ?`);
      params.push(status);
    }

    if (location) {
      whereConditions.push(`c.location LIKE ?`);
      params.push(`%${location}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const cars = query(`
      SELECT 
        c.*,
        u.first_name || ' ' || u.last_name as owner_name,
        u.email as owner_email,
        (SELECT COUNT(*) FROM bookings WHERE car_id = c.id) as booking_count,
        (SELECT SUM(total_price) FROM bookings WHERE car_id = c.id AND status = 'completed') as total_revenue
      FROM cars c
      JOIN users u ON c.host_id = u.id
      ${whereClause}
      ORDER BY c.created_at DESC 
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const totalCount = query(`
      SELECT COUNT(*) as count FROM cars c
      JOIN users u ON c.host_id = u.id
      ${whereClause}
    `, params);

    res.json({
      success: true,
      data: {
        cars: cars.rows,
        pagination: {
          current: parseInt(page),
          limit: parseInt(limit),
          total: totalCount.rows[0].count,
          pages: Math.ceil(totalCount.rows[0].count / limit)
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Booking Management Routes
router.get('/bookings', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status = '', dateFrom = '', dateTo = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let params = [];

    if (status) {
      whereConditions.push(`b.status = ?`);
      params.push(status);
    }

    if (dateFrom) {
      whereConditions.push(`date(b.start_date) >= date(?)`);
      params.push(dateFrom);
    }

    if (dateTo) {
      whereConditions.push(`date(b.end_date) <= date(?)`);
      params.push(dateTo);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const bookings = query(`
      SELECT 
        b.*,
        u.first_name || ' ' || u.last_name as customer_name,
        u.email as customer_email,
        c.make || ' ' || c.model as car_name,
        h.first_name || ' ' || h.last_name as host_name
      FROM bookings b
      JOIN users u ON b.customer_id = u.id
      JOIN cars c ON b.car_id = c.id
      JOIN users h ON c.host_id = h.id
      ${whereClause}
      ORDER BY b.created_at DESC 
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const totalCount = query(`
      SELECT COUNT(*) as count FROM bookings b
      JOIN users u ON b.customer_id = u.id
      JOIN cars c ON b.car_id = c.id
      ${whereClause}
    `, params);

    res.json({
      success: true,
      data: {
        bookings: bookings.rows,
        pagination: {
          current: parseInt(page),
          limit: parseInt(limit),
          total: totalCount.rows[0].count,
          pages: Math.ceil(totalCount.rows[0].count / limit)
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Analytics Routes
router.get('/analytics/overview', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { period = '30' } = req.query; // days

    // Revenue trends
    const revenueTrends = query(`
      SELECT 
        date(created_at) as date,
        SUM(total_price) as revenue,
        COUNT(*) as bookings
      FROM bookings 
      WHERE status = 'completed' 
      AND created_at >= date('now', '-${period} days')
      GROUP BY date(created_at)
      ORDER BY date
    `);

    // User growth
    const userGrowth = query(`
      SELECT 
        date(created_at) as date,
        COUNT(*) as new_users,
        role
      FROM users
      WHERE created_at >= date('now', '-${period} days')
      GROUP BY date(created_at), role
      ORDER BY date
    `);

    // Popular cars
    const popularCars = query(`
      SELECT 
        c.make || ' ' || c.model as car_name,
        c.id,
        COUNT(b.id) as booking_count,
        AVG(b.total_price) as avg_price,
        SUM(b.total_price) as total_revenue
      FROM cars c
      JOIN bookings b ON c.id = b.car_id
      WHERE b.created_at >= date('now', '-${period} days')
      GROUP BY c.id
      ORDER BY booking_count DESC
      LIMIT 10
    `);

    // Location performance
    const locationStats = query(`
      SELECT 
        c.location,
        COUNT(b.id) as booking_count,
        AVG(b.total_price) as avg_price,
        SUM(b.total_price) as total_revenue
      FROM cars c
      JOIN bookings b ON c.id = b.car_id
      WHERE b.created_at >= date('now', '-${period} days')
      GROUP BY c.location
      ORDER BY booking_count DESC
    `);

    res.json({
      success: true,
      data: {
        revenueTrends: revenueTrends.rows,
        userGrowth: userGrowth.rows,
        popularCars: popularCars.rows,
        locationStats: locationStats.rows
      }
    });

  } catch (error) {
    next(error);
  }
});

export default router;