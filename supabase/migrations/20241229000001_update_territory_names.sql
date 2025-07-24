-- =============================================================
-- TERRITORY NAMES UPDATE MIGRATION
-- Updates all territory names to new standardized naming convention
-- =============================================================

-- Update territory names to new naming convention
UPDATE territories SET name = 'South Florida' WHERE name = 'Miami';
UPDATE territories SET name = 'Central Florida' WHERE name = 'Winter Park';
UPDATE territories SET name = 'North Central Florida' WHERE name = 'Ocala';
UPDATE territories SET name = 'East Missouri' WHERE name = 'St. Louis';
UPDATE territories SET name = 'Northeast Florida' WHERE name = 'Jacksonville';
UPDATE territories SET name = 'Southeast Florida' WHERE name = 'Stuart';
UPDATE territories SET name = 'West Missouri' WHERE name = 'Kansas City';

-- Update region names to match new territory names for consistency
UPDATE territories SET region = 'South Florida Region' WHERE name = 'South Florida';
UPDATE territories SET region = 'Central Florida Region' WHERE name = 'Central Florida';
UPDATE territories SET region = 'North Central Florida Region' WHERE name = 'North Central Florida';
UPDATE territories SET region = 'East Missouri Region' WHERE name = 'East Missouri';
UPDATE territories SET region = 'Northeast Florida Region' WHERE name = 'Northeast Florida';
UPDATE territories SET region = 'Southeast Florida Region' WHERE name = 'Southeast Florida';
UPDATE territories SET region = 'West Missouri Region' WHERE name = 'West Missouri';

-- Keep Tampa as is (not in the update list)
-- Update Tampa region for consistency
UPDATE territories SET region = 'Central Florida Region' WHERE name = 'Tampa';

-- Verification query - uncomment to check results
-- SELECT id, name, region FROM territories ORDER BY name; 