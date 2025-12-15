-- Migration: Add Login Security Columns
-- Date: 2025-12-12
-- Description: Add failed_login_attempts and locked_until columns to users table for account security

-- Add failed_login_attempts column if it doesn't exist
ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;

-- Add locked_until column if it doesn't exist
ALTER TABLE users ADD COLUMN locked_until DATETIME;

-- Create index on locked_until for faster lockout checks
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until);
