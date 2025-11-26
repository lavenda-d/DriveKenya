import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create SQLite database file in the project directory
const dbPath = path.join(__dirname, '..', 'driveKenya.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log(`🗄️  Connected to SQLite database at: ${dbPath}`);

// Create tables if they don't exist
const createTables = () => {
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

  // Cars table with owner information
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
      features TEXT, -- JSON string
      images TEXT, -- JSON array of image URLs
      available BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Rentals table
  db.exec(`
    CREATE TABLE IF NOT EXISTS rentals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      car_id INTEGER NOT NULL,
      renter_id INTEGER NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      total_price DECIMAL(10,2) NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled')),
      pickup_location TEXT,
      dropoff_location TEXT,
      special_requests TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE,
      FOREIGN KEY (renter_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Reviews table
  db.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rental_id INTEGER NOT NULL,
      reviewer_id INTEGER NOT NULL,
      car_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (rental_id) REFERENCES rentals(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
    )
  `);

  // Messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      recipient_id INTEGER NOT NULL,
      subject TEXT,
      content TEXT NOT NULL,
      read_status BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Chat messages table for real-time chat
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_room TEXT NOT NULL,
      sender_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      message_type TEXT DEFAULT 'text' CHECK(message_type IN ('text', 'image', 'file')),
      read_status BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Chat notifications table for unread message tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      chat_room TEXT NOT NULL,
      unread_count INTEGER DEFAULT 0,
      last_message_id INTEGER,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (last_message_id) REFERENCES chat_messages(id) ON DELETE SET NULL,
      UNIQUE(user_id, chat_room)
    )
  `);

  // Car images table for enhanced image management
  db.exec(`
    CREATE TABLE IF NOT EXISTS car_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      car_id INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      image_type TEXT DEFAULT 'standard' CHECK(image_type IN ('standard', '360', 'interior', 'exterior')),
      display_order INTEGER DEFAULT 0,
      is_primary BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
    )
  `);

  // Car specifications table for structured specs
  db.exec(`
    CREATE TABLE IF NOT EXISTS car_specs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      car_id INTEGER NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('engine', 'dimensions', 'features', 'safety', 'performance', 'comfort')),
      spec_key TEXT NOT NULL,
      spec_value TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      file_url TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reviewed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  const userCols = db.prepare("PRAGMA table_info(users)").all();
  const hasCol = (name) => userCols.some(c => c.name === name);
  if (!hasCol('avatar_url')) db.exec("ALTER TABLE users ADD COLUMN avatar_url TEXT");
  if (!hasCol('is_verified')) db.exec("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE");
  if (!hasCol('profile_completed')) db.exec("ALTER TABLE users ADD COLUMN profile_completed BOOLEAN DEFAULT FALSE");
  if (!hasCol('last_login_at')) db.exec("ALTER TABLE users ADD COLUMN last_login_at DATETIME");
  if (!hasCol('failed_login_attempts')) db.exec("ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0");
  if (!hasCol('locked_until')) db.exec("ALTER TABLE users ADD COLUMN locked_until DATETIME");
  if (!hasCol('email_verification_token')) db.exec("ALTER TABLE users ADD COLUMN email_verification_token TEXT");
  if (!hasCol('email_verification_sent_at')) db.exec("ALTER TABLE users ADD COLUMN email_verification_sent_at DATETIME");

  console.log('✅ Database tables created successfully');
};

// Initialize tables
createTables();

// Helper function to run queries with parameters
export const query = (sql, params = []) => {
  try {
    if (sql.trim().toLowerCase().startsWith('select')) {
      const stmt = db.prepare(sql);
      const result = stmt.all(...params);
      return { rows: result, rowCount: result.length };
    } else {
      const stmt = db.prepare(sql);
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
  const trans = db.transaction(callback);
  return trans;
};

export default db;