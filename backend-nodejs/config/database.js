import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'nairobi_car_hire',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle
  connectionTimeoutMillis: 2000, // how long to try connecting before timing out
};

// Create connection pool
const pool = new Pool(dbConfig);

// Test database connection
pool.on('connect', () => {
  console.log('🔗 Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('💥 Database connection error:', err);
  process.exit(-1);
});

// Query function with error handling
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('⚡ Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('💥 Database query error:', error);
    throw error;
  }
};

// Get a client from the pool for transactions
export const getClient = () => {
  return pool.connect();
};

// Close the pool
export const closePool = () => {
  return pool.end();
};

export default pool;