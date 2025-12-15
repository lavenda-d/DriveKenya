-- Migration: Add missing user profile columns
-- Date: 2025-12-12
-- Description: Add avatar_url and is_verified columns to users table

-- Add avatar_url column (alias for profile_photo)
ALTER TABLE users ADD COLUMN avatar_url TEXT;

-- Add is_verified column (for profile verification status)
ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0;

-- Update existing users to have is_verified match email_verified
UPDATE users SET is_verified = CASE WHEN email_verified = 1 THEN 1 ELSE 0 END WHERE is_verified IS NULL;
