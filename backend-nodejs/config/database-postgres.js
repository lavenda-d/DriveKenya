import pg from 'pg';
import env from './env.js';

const { Pool } = pg;

// Database connection configuration
const dbConfig = {
    host: env.dbHost,
    port: env.dbPort,
    database: env.dbName,
    user: env.dbUser,
    password: env.dbPassword,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
};

// Create connection pool
const pool = new Pool(dbConfig);

// Test database connection
pool.on('connect', () => {
    console.log('🔗 Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('💥 Database connection error:', err);
    if (env.isProduction) process.exit(-1);
});

/**
 * Translates SQLite style "?" placeholders to PostgreSQL style "$n" placeholders
 * and handles RETURNING for INSERT statements to emulate insertId.
 */
const translateQuery = (sql, params) => {
    let paramIndex = 1;
    const translatedSql = sql.replace(/\?/g, () => `$${paramIndex++}`);

    // If it's an INSERT and doesn't have RETURNING, add it to get the ID
    let finalSql = translatedSql;
    const isInsert = sql.trim().toLowerCase().startsWith('insert');
    if (isInsert && !translatedSql.toLowerCase().includes('returning')) {
        finalSql += ' RETURNING id';
    }

    return finalSql;
};

// Query function with error handling and placeholder translation
export const query = async (sql, params = []) => {
    const finalSql = translateQuery(sql, params);
    const start = Date.now();

    try {
        const res = await pool.query(finalSql, params);
        const duration = Date.now() - start;

        // Log query in development
        if (!env.isProduction) {
            console.log('⚡ Executed query', {
                text: filterSensitive(finalSql),
                duration: `${duration}ms`,
                rows: res.rowCount
            });
        }

        // Emulate SQLite's result format
        const result = {
            rows: res.rows,
            rowCount: res.rowCount,
        };

        // If it was an insert with RETURNING id, populate insertId
        if (sql.trim().toLowerCase().startsWith('insert') && res.rows.length > 0) {
            result.insertId = res.rows[0].id;
            result.lastInsertRowid = res.rows[0].id; // For compatibility
        }

        return result;
    } catch (error) {
        console.error('💥 Database query error:', {
            sql: filterSensitive(finalSql),
            error: error.message
        });
        throw error;
    }
};

const filterSensitive = (sql) => {
    return sql.replace(/password\s*=\s*'[^']*'/gi, "password = '****'");
};

// Transaction support
export const transaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Create tables if they don't exist
export const createTables = async () => {
    console.log('🏗️  Initializing PostgreSQL schema...');
    try {
        // Users table
        await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
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
        last_login_at TIMESTAMP,
        failed_login_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMP,
        email_verification_token TEXT,
        email_verification_sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Cars table
        await query(`
      CREATE TABLE IF NOT EXISTS cars (
        id SERIAL PRIMARY KEY,
        host_id INTEGER NOT NULL REFERENCES users(id),
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
        features TEXT, -- Stored as JSON string for now to match SQLite
        images TEXT, -- Stored as JSON string
        main_image_url TEXT,
        gallery_json TEXT,
        video_url TEXT,
        fuel_type TEXT,
        transmission TEXT,
        category TEXT,
        vehicle_type TEXT DEFAULT 'car',
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'maintenance', 'pending_approval')),
        availability_status TEXT DEFAULT 'available',
        admin_approved BOOLEAN DEFAULT FALSE,
        insurance_verified BOOLEAN DEFAULT FALSE,
        available INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Car images
        await query(`
      CREATE TABLE IF NOT EXISTS car_images (
        id SERIAL PRIMARY KEY,
        car_id INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        image_type TEXT DEFAULT 'standard',
        display_order INTEGER DEFAULT 0,
        is_primary BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Car specs
        await query(`
      CREATE TABLE IF NOT EXISTS car_specs (
        id SERIAL PRIMARY KEY,
        car_id INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        spec_key TEXT NOT NULL,
        spec_value TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Bookings table
        await query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES users(id),
        car_id INTEGER NOT NULL REFERENCES cars(id),
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Car availability
        await query(`
      CREATE TABLE IF NOT EXISTS car_availability (
        id SERIAL PRIMARY KEY,
        car_id INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status TEXT CHECK(status IN ('available', 'booked', 'maintenance')),
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Reviews table
        await query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER NOT NULL REFERENCES bookings(id),
        car_id INTEGER NOT NULL REFERENCES cars(id),
        customer_id INTEGER NOT NULL REFERENCES users(id),
        reviewer_id INTEGER REFERENCES users(id),
        host_id INTEGER NOT NULL REFERENCES users(id),
        rating INTEGER CHECK(rating >= 1 AND rating <= 5),
        comment TEXT,
        photos TEXT,
        admin_moderated BOOLEAN DEFAULT FALSE,
        visible BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Messages table
        await query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER REFERENCES bookings(id),
        sender_id INTEGER NOT NULL REFERENCES users(id),
        recipient_id INTEGER NOT NULL REFERENCES users(id),
        message_text TEXT NOT NULL,
        message_type TEXT DEFAULT 'customer_support' CHECK(message_type IN ('booking_inquiry', 'customer_support', 'admin_notification', 'system_message')),
        admin_escalated BOOLEAN DEFAULT FALSE,
        read_status BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Notifications table
        await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type TEXT NOT NULL CHECK(type IN ('booking_confirmed', 'payment_received', 'maintenance_due', 'admin_message', 'review_received')),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        data TEXT,
        read_status BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Support tickets
        await query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        subject TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
        status TEXT DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'resolved', 'closed')),
        assigned_to INTEGER REFERENCES users(id),
        resolution_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP
      )
    `);

        // Fraud detections
        await query(`
      CREATE TABLE IF NOT EXISTS fraud_detections (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        booking_id INTEGER REFERENCES bookings(id),
        detection_type TEXT NOT NULL CHECK(detection_type IN ('multiple_bookings', 'suspicious_location', 'payment_anomaly', 'behavioral_anomaly')),
        risk_score DECIMAL(3,2) NOT NULL,
        details TEXT,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'confirmed', 'false_positive')),
        reviewed_by INTEGER REFERENCES users(id),
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Emergency contacts
        await query(`
      CREATE TABLE IF NOT EXISTS emergency_contacts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        relationship TEXT,
        is_primary BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Emergency alerts
        await query(`
      CREATE TABLE IF NOT EXISTS emergency_alerts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        booking_id INTEGER REFERENCES bookings(id),
        alert_type TEXT NOT NULL CHECK(alert_type IN ('panic', 'breakdown', 'accident', 'medical')),
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        message TEXT,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'resolved', 'false_alarm')),
        responder_id INTEGER REFERENCES users(id),
        response_time TIMESTAMP,
        resolution_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        console.log('✅ PostgreSQL schema initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing PostgreSQL schema:', error);
        throw error;
    }
};

export default { query, transaction, createTables, pool };
