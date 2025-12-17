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

// Debug: Log if EMAIL_PASSWORD is loaded
console.log('🔍 Environment check:', {
  EMAIL_PASSWORD: emailPassword ? '✅ Loaded' : '❌ Missing',
  EMAIL_USER: emailUser || '❌ Missing',
  NODE_ENV: process.env.NODE_ENV
});

// Set JWT_SECRET with fallback if not in .env
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'driveKenya-secret-2024';
  console.log('⚠️  Using default JWT_SECRET. Set JWT_SECRET in .env for production!');
}

export default {
  emailUser,
  emailPassword,
  emailHost,
  emailPort,
  emailFrom
};
