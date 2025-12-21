import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create SQLite database file in the project directory
const dbPath = path.join(__dirname, '..', 'driveKenya.db');
const sqliteInstance = new Database(dbPath);

// Enable foreign keys
sqliteInstance.pragma('foreign_keys = ON');

console.log(`🗄️  Connected to SQLite database at: ${dbPath}`);

// Create tables if they don't exist
const createTables = (db = sqliteInstance) => {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT,
      role TEXT DEFAULT 'customer' CHECK(role IN ('customer', 'admin', 'host')),
      email_verified BOOLEAN DEFAULT FALSE,
      avatar_url TEXT,
      is_verified BOOLEAN DEFAULT FALSE,
      profile_completed BOOLEAN DEFAULT FALSE,
      last_login_at DATETIME,
      failed_login_attempts INTEGER DEFAULT 0,
      locked_until DATETIME,
      email_verification_token TEXT,
      email_verification_sent_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Cars table with enhanced fields for business features
  db.exec(`
    CREATE TABLE IF NOT EXISTS cars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      host_id INTEGER NOT NULL,
      owner_name TEXT NOT NULL,
      owner_email TEXT NOT NULL,
      owner_phone TEXT,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER NOT NULL,
      color TEXT,
      license_plate TEXT UNIQUE NOT NULL,
      price_per_day DECIMAL(10,2) NOT NULL,
      location TEXT NOT NULL,
      description TEXT,
      features TEXT,
      images TEXT,
      fuel_type TEXT,
      transmission TEXT,
      category TEXT,
      vehicle_type TEXT DEFAULT 'car',
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'maintenance', 'pending_approval')),
      admin_approved BOOLEAN DEFAULT FALSE,
      insurance_verified BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (host_id) REFERENCES users(id)
    )
  `);

  // Enhanced bookings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      car_id INTEGER NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      total_price DECIMAL(10,2) NOT NULL,
      base_price DECIMAL(10,2) NOT NULL,
      dynamic_pricing_multiplier DECIMAL(3,2) DEFAULT 1.00,
      platform_fee DECIMAL(10,2) DEFAULT 0.00,
      insurance_fee DECIMAL(10,2) DEFAULT 0.00,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled')),
      payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'refunded')),
      payment_method TEXT,
      cancellation_reason TEXT,
      admin_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES users(id),
      FOREIGN KEY (car_id) REFERENCES cars(id)
    )
  `);

  // Car availability blocks (for maintenance, personal use, etc.)
  db.exec(`
    CREATE TABLE IF NOT EXISTS car_availability_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      car_id INTEGER NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      reason TEXT,
      type TEXT DEFAULT 'owner_block' CHECK(type IN ('owner_block', 'maintenance', 'admin_block')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (car_id) REFERENCES cars(id)
    )
  `);

  // Car maintenance tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS car_maintenance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      car_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('oil_change', 'tire_rotation', 'brake_service', 'general_inspection', 'repair', 'other')),
      description TEXT,
      scheduled_date DATE,
      completed_date DATE,
      cost DECIMAL(10,2),
      provider TEXT,
      status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (car_id) REFERENCES cars(id)
    )
  `);

  // Dynamic pricing rules
  db.exec(`
    CREATE TABLE IF NOT EXISTS pricing_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      rule_type TEXT CHECK(rule_type IN ('time_based', 'demand_based', 'distance_based', 'seasonal')),
      conditions TEXT, -- JSON string with rule conditions
      multiplier DECIMAL(3,2) NOT NULL,
      priority INTEGER DEFAULT 1,
      active BOOLEAN DEFAULT TRUE,
      valid_from DATE,
      valid_to DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Enhanced reviews table
  db.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      car_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      host_id INTEGER NOT NULL,
      rating INTEGER CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      photos TEXT, -- JSON array of photo URLs
      admin_moderated BOOLEAN DEFAULT FALSE,
      visible BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id),
      FOREIGN KEY (car_id) REFERENCES cars(id),
      FOREIGN KEY (customer_id) REFERENCES users(id),
      FOREIGN KEY (host_id) REFERENCES users(id)
    )
  `);

  // Messages table (enhanced for admin support)
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER,
      sender_id INTEGER NOT NULL,
      recipient_id INTEGER NOT NULL,
      message_text TEXT NOT NULL,
      message_type TEXT DEFAULT 'customer_support' CHECK(message_type IN ('booking_inquiry', 'customer_support', 'admin_notification', 'system_message')),
      admin_escalated BOOLEAN DEFAULT FALSE,
      read_status BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id),
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (recipient_id) REFERENCES users(id)
    )
  `);

  // Notifications table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('booking_confirmed', 'payment_received', 'maintenance_due', 'admin_message', 'review_received')),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      data TEXT, -- JSON string with additional data
      read_status BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Admin activity logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id INTEGER,
      description TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES users(id)
    )
  `);

  // Fleet analytics (for multi-car owners)
  db.exec(`
    CREATE TABLE IF NOT EXISTS fleet_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      total_revenue DECIMAL(12,2),
      total_bookings INTEGER,
      avg_utilization_rate DECIMAL(5,2),
      top_performing_car_id INTEGER,
      maintenance_costs DECIMAL(10,2),
      net_profit DECIMAL(12,2),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id),
      FOREIGN KEY (top_performing_car_id) REFERENCES cars(id)
    )
  `);

  // Phase 4 Advanced Features Tables

  // Two-factor authentication settings
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_two_factor (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      method TEXT NOT NULL CHECK(method IN ('sms', 'email', 'authenticator')),
      secret TEXT, -- For TOTP
      backup_codes TEXT, -- JSON array of backup codes
      enabled BOOLEAN DEFAULT FALSE,
      last_used DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Biometric authentication settings
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_authenticators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      credential_id TEXT NOT NULL UNIQUE,
      public_key TEXT NOT NULL,
      counter INTEGER DEFAULT 0,
      device_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_used DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Fraud detection alerts
  db.exec(`
    CREATE TABLE IF NOT EXISTS fraud_detections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      booking_id INTEGER,
      detection_type TEXT NOT NULL CHECK(detection_type IN ('multiple_bookings', 'suspicious_location', 'payment_anomaly', 'behavioral_anomaly')),
      risk_score DECIMAL(3,2) NOT NULL,
      details TEXT, -- JSON string with detection details
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'confirmed', 'false_positive')),
      reviewed_by INTEGER,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (booking_id) REFERENCES bookings(id),
      FOREIGN KEY (reviewed_by) REFERENCES users(id)
    )
  `);

  // Fraud alerts
  db.exec(`
    CREATE TABLE IF NOT EXISTS fraud_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fraud_detection_id INTEGER NOT NULL,
      alert_type TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT DEFAULT 'medium' CHECK(severity IN ('low', 'medium', 'high', 'critical')),
      acknowledged BOOLEAN DEFAULT FALSE,
      acknowledged_by INTEGER,
      acknowledged_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (fraud_detection_id) REFERENCES fraud_detections(id),
      FOREIGN KEY (acknowledged_by) REFERENCES users(id)
    )
  `);

  // User behavior tracking for ML
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_behavior_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      page_url TEXT,
      ip_address TEXT,
      user_agent TEXT,
      session_id TEXT,
      additional_data TEXT, -- JSON string
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // AI recommendations feedback
  db.exec(`
    CREATE TABLE IF NOT EXISTS recommendation_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      recommendation_type TEXT NOT NULL,
      car_id INTEGER,
      feedback_type TEXT NOT NULL CHECK(feedback_type IN ('positive', 'negative', 'viewed', 'clicked', 'booked')),
      recommendation_data TEXT, -- JSON with recommendation details
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (car_id) REFERENCES cars(id)
    )
  `);

  // GPS location history
  db.exec(`
    CREATE TABLE IF NOT EXISTS location_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      booking_id INTEGER,
      latitude DECIMAL(10,8) NOT NULL,
      longitude DECIMAL(11,8) NOT NULL,
      accuracy DECIMAL(8,2),
      speed DECIMAL(8,2),
      heading DECIMAL(8,2),
      altitude DECIMAL(8,2),
      timestamp DATETIME NOT NULL,
      location_type TEXT DEFAULT 'tracking' CHECK(location_type IN ('tracking', 'pickup', 'dropoff', 'waypoint')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (booking_id) REFERENCES bookings(id)
    )
  `);

  // Emergency contacts
  db.exec(`
    CREATE TABLE IF NOT EXISTS emergency_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      relationship TEXT,
      is_primary BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Emergency alerts
  db.exec(`
    CREATE TABLE IF NOT EXISTS emergency_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      booking_id INTEGER,
      alert_type TEXT NOT NULL CHECK(alert_type IN ('panic', 'breakdown', 'accident', 'medical')),
      latitude DECIMAL(10,8),
      longitude DECIMAL(11,8),
      message TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'resolved', 'false_alarm')),
      responder_id INTEGER,
      response_time DATETIME,
      resolution_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (booking_id) REFERENCES bookings(id),
      FOREIGN KEY (responder_id) REFERENCES users(id)
    )
  `);

  // Performance metrics
  db.exec(`
    CREATE TABLE IF NOT EXISTS performance_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric_name TEXT NOT NULL,
      metric_value DECIMAL(15,4) NOT NULL,
      metric_unit TEXT,
      category TEXT,
      user_id INTEGER,
      url TEXT,
      user_agent TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Performance errors
  db.exec(`
    CREATE TABLE IF NOT EXISTS performance_errors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      error_type TEXT NOT NULL,
      error_message TEXT NOT NULL,
      stack_trace TEXT,
      url TEXT,
      user_id INTEGER,
      user_agent TEXT,
      severity TEXT DEFAULT 'error' CHECK(severity IN ('warning', 'error', 'critical')),
      resolved BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Support tickets
  db.exec(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
      status TEXT DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'resolved', 'closed')),
      assigned_to INTEGER,
      resolution_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (assigned_to) REFERENCES users(id)
    )
  `);

  // Ticket messages
  db.exec(`
    CREATE TABLE IF NOT EXISTS ticket_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      sender_type TEXT NOT NULL CHECK(sender_type IN ('user', 'admin', 'system')),
      sender_id INTEGER,
      message TEXT NOT NULL,
      attachments TEXT, -- JSON array of file paths
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES support_tickets(id),
      FOREIGN KEY (sender_id) REFERENCES users(id)
    )
  `);

  // Live chat sessions
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      agent_id INTEGER,
      status TEXT DEFAULT 'waiting' CHECK(status IN ('waiting', 'active', 'ended')),
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME,
      rating INTEGER CHECK(rating >= 1 AND rating <= 5),
      feedback TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (agent_id) REFERENCES users(id)
    )
  `);

  // Chat messages
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      sender_type TEXT NOT NULL CHECK(sender_type IN ('user', 'agent', 'system')),
      sender_id INTEGER,
      message TEXT NOT NULL,
      attachments TEXT, -- JSON array
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id),
      FOREIGN KEY (sender_id) REFERENCES users(id)
    )
  `);

  // FAQ items
  db.exec(`
    CREATE TABLE IF NOT EXISTS faq_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      published BOOLEAN DEFAULT TRUE,
      view_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Help articles
  db.exec(`
    CREATE TABLE IF NOT EXISTS help_articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT NOT NULL,
      tags TEXT, -- JSON array
      published BOOLEAN DEFAULT TRUE,
      view_count INTEGER DEFAULT 0,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  console.log('✅ All business and Phase 4 advanced feature tables created successfully');

  // AUTO-MIGRATION: Add vehicle_type to cars if missing (fixes 500 error on filters)
  try {
    const columns = db.pragma('table_info(cars)');
    const hasVehicleType = columns.some(col => col.name === 'vehicle_type');
    if (!hasVehicleType) {
      db.exec("ALTER TABLE cars ADD COLUMN vehicle_type TEXT DEFAULT 'car'");
      console.log('🔄 Schema updated: Added missing vehicle_type column to cars table');
    }
  } catch (error) {
    console.error('⚠️ Schema migration warning:', error.message);
  }
};

// Initialize tables
createTables(sqliteInstance);

export { createTables };

// Helper function to run queries with parameters
export const query = (sql, params = []) => {
  try {
    if (sql.trim().toLowerCase().startsWith('select')) {
      const stmt = sqliteInstance.prepare(sql);
      const result = stmt.all(...params);
      return { rows: result, rowCount: result.length };
    } else {
      const stmt = sqliteInstance.prepare(sql);
      const result = stmt.run(...params);
      return {
        rows: [],
        rowCount: result.changes,
        insertId: result.lastInsertRowid
      };
    }
  } catch (error) {
    console.error('💥 Database query error:', error);
    throw error;
  }
};

// Transaction support
export const transaction = (callback) => {
  const trans = sqliteInstance.transaction(callback);
  return trans;
};

export default sqliteInstance;
