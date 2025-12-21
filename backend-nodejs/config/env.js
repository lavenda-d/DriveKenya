import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables FIRST
// config folder is inside backend-nodejs, so go up one level to find .env
dotenv.config({ path: join(__dirname, '..', '.env') });

// Validate and trim email credentials
export const emailUser = (process.env.EMAIL_USER || '').trim();
export const emailPassword = (process.env.EMAIL_PASSWORD || '').trim();
export const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
export const emailPort = parseInt(process.env.EMAIL_PORT || '587');
export const emailFrom = process.env.EMAIL_FROM || 'drivekenyaorg@gmail.com';

const isProduction = process.env.NODE_ENV === 'production';

// Database Configuration
export const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
export const dbHost = process.env.DB_HOST || 'localhost';
export const dbPort = parseInt(process.env.DB_PORT || '5432');
export const dbName = process.env.DB_NAME || 'drivekenya';
export const dbUser = process.env.DB_USER || 'postgres';
export const dbPassword = process.env.DB_PASSWORD || '';

// Critical Environment Variables Validation
const criticalEnvVars = [
  'JWT_SECRET',
  'FRONTEND_URL'
];

if (dbType === 'postgres' && isProduction) {
  criticalEnvVars.push('DB_PASSWORD');
}

if (isProduction) {
  const missingVars = criticalEnvVars.filter(v => !process.env[v]);
  if (missingVars.length > 0) {
    console.error('❌ CRITICAL ERROR: Missing required environment variables for production:');
    missingVars.forEach(v => console.error(`   - ${v}`));
    process.exit(1);
  }
} else {
  // Set fallback JWT_SECRET ONLY in development
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'driveKenya-dev-secret-key-2025';
    console.warn('⚠️  WARNING: JWT_SECRET not set. Using development placeholder. DO NOT USE IN PRODUCTION!');
  }
}

// Debug: Log environment status (avoid logging sensitive values directly)
console.log('🔍 Environment Initialization:', {
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB_TYPE: dbType,
  DB_HOST: dbHost,
  JWT_SECRET: process.env.JWT_SECRET ? '✅ Configured' : '❌ NOT SET',
  EMAIL_CONFIG: emailUser && emailPassword ? '✅ Configured' : '⚠️ Partial',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000 (Default)'
});

export default {
  emailUser,
  emailPassword,
  emailHost,
  emailPort,
  emailFrom,
  isProduction,
  dbType,
  dbHost,
  dbPort,
  dbName,
  dbUser,
  dbPassword
};
