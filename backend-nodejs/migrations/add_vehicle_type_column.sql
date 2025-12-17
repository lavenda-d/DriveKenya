-- Add vehicle_type column to cars table
-- This allows the platform to support multiple vehicle types beyond just cars

ALTER TABLE cars ADD COLUMN vehicle_type TEXT DEFAULT 'car';

-- Update description to reflect this is a multi-vehicle platform
-- Update existing records to have vehicle_type = 'car' for backwards compatibility
UPDATE cars SET vehicle_type = 'car' WHERE vehicle_type IS NULL;
