-- Migration: Add seats column to cars table
-- This allows storing the number of seats for each vehicle

-- Add seats column to cars table (default to NULL since not all vehicles have traditional seating)
ALTER TABLE cars ADD COLUMN seats INTEGER DEFAULT NULL;

-- Update existing cars to have reasonable defaults based on vehicle_type
-- (These are just examples, actual values should be set by owners)
UPDATE cars SET seats = 
  CASE 
    WHEN vehicle_type = 'bicycle' THEN 1
    WHEN vehicle_type = 'motorbike' THEN 2
    WHEN vehicle_type = 'tuktuk' THEN 3
    WHEN vehicle_type = 'car' THEN 5
    WHEN vehicle_type = 'suv' THEN 7
    WHEN vehicle_type = 'van' THEN 8
    WHEN vehicle_type = 'bus' THEN 14
    ELSE NULL
  END
WHERE seats IS NULL;
