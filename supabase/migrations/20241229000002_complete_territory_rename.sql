-- =============================================================
-- COMPLETE TERRITORY RENAME MIGRATION
-- This migration ensures all territories are properly renamed
-- and adds the missing Southwest Florida territory
-- =============================================================

-- First, check if territories already exist with new names
-- If they do, we'll just update Tampa. If not, we'll do full rename

-- Update Tampa to Southwest Florida
UPDATE territories 
SET name = 'Southwest Florida',
    region = 'Southwest Florida Region'
WHERE LOWER(name) = 'tampa';

-- Ensure all other territories have correct names (in case previous migration failed)
UPDATE territories SET name = 'South Florida', region = 'South Florida Region' 
WHERE LOWER(name) = 'miami' AND name != 'South Florida';

UPDATE territories SET name = 'Central Florida', region = 'Central Florida Region' 
WHERE LOWER(name) = 'winter park' AND name != 'Central Florida';

UPDATE territories SET name = 'North Central Florida', region = 'North Central Florida Region' 
WHERE LOWER(name) = 'ocala' AND name != 'North Central Florida';

UPDATE territories SET name = 'Northeast Florida', region = 'Northeast Florida Region' 
WHERE LOWER(name) = 'jacksonville' AND name != 'Northeast Florida';

UPDATE territories SET name = 'Southeast Florida', region = 'Southeast Florida Region' 
WHERE LOWER(name) = 'stuart' AND name != 'Southeast Florida';

-- Add Missouri territories if they don't exist
INSERT INTO territories (name, region, is_active) 
VALUES 
  ('East Missouri', 'East Missouri Region', true),
  ('West Missouri', 'West Missouri Region', true)
ON CONFLICT (name) DO NOTHING;

-- Ensure all territories are active
UPDATE territories SET is_active = true WHERE is_active IS NULL OR is_active = false;

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_territories_name ON territories(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_territories_is_active ON territories(is_active);

-- Verification query - uncomment to check results
-- SELECT id, name, region, is_active FROM territories ORDER BY name; 