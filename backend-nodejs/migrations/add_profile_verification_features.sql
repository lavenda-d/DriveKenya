-- Migration: Add Profile & Verification Features
-- Date: 2025-12-06
-- Description: Add tables and columns for profile photos, document verification, and blackout dates

-- Add profile_photo column to users table
ALTER TABLE users ADD COLUMN profile_photo TEXT;

-- Create user_verification_documents table
CREATE TABLE IF NOT EXISTS user_verification_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  document_type VARCHAR(50) NOT NULL,
  front_image_url TEXT NOT NULL,
  back_image_url TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  rejection_reason TEXT,
  reviewed_by INTEGER,
  reviewed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_verification_user_id ON user_verification_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_status ON user_verification_documents(status);

-- Create car_blackout_dates table
CREATE TABLE IF NOT EXISTS car_blackout_dates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  car_id INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_blackout_car_id ON car_blackout_dates(car_id);
CREATE INDEX IF NOT EXISTS idx_blackout_dates ON car_blackout_dates(start_date, end_date);

-- Insert sample data (optional - remove in production)
-- This is just for testing purposes

-- Verification status values: 'pending', 'approved', 'rejected', 'not_submitted'
