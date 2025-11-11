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