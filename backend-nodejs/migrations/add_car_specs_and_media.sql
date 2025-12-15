-- Add car specs and media fields to cars table
-- Note: SQLite doesn't support IF NOT EXISTS with ALTER TABLE ADD COLUMN
-- The run-migrations.js script will handle "duplicate column" errors gracefully

ALTER TABLE cars ADD COLUMN fuel_type TEXT;
ALTER TABLE cars ADD COLUMN transmission TEXT;
ALTER TABLE cars ADD COLUMN category TEXT; -- e.g., SUV, Sedan, Hatchback
ALTER TABLE cars ADD COLUMN main_image_url TEXT;
ALTER TABLE cars ADD COLUMN gallery_json TEXT; -- JSON array of image URLs
ALTER TABLE cars ADD COLUMN video_url TEXT;
ALTER TABLE cars ADD COLUMN availability_status TEXT DEFAULT 'available';

-- Backfill defaults where practical
UPDATE cars SET availability_status = COALESCE(availability_status, 'available') WHERE availability_status IS NULL;