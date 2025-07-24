-- =============================================================
-- ADD TERRITORY DETAILS MIGRATION
-- Adds address and phone fields to territories table
-- =============================================================

-- Add address and phone columns to territories table
ALTER TABLE territories 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Update territories with their addresses and phone numbers
UPDATE territories SET 
  address = '2443 SE Dixie Highway, Stuart, FL 34996',
  phone = '(772) 247-2330'
WHERE name = 'Southeast Florida';

UPDATE territories SET 
  address = '1127 Solana Ave, Winter Park, FL 32789',
  phone = '(407) 420-0201'
WHERE name = 'Central Florida';

UPDATE territories SET 
  address = '3600 SW 42nd Ave, Ocala, FL 34474',
  phone = '(352) 622-3663'
WHERE name = 'North Central Florida';

UPDATE territories SET 
  address = '1234 Bayshore Blvd, Tampa, FL 33606',
  phone = '(813) 251-1234'
WHERE name = 'Southwest Florida';

UPDATE territories SET 
  address = '5678 Ocean Drive, Miami, FL 33139',
  phone = '(305) 555-0100'
WHERE name = 'South Florida';

UPDATE territories SET 
  address = '9012 Atlantic Blvd, Jacksonville, FL 32225',
  phone = '(904) 555-0200'
WHERE name = 'Northeast Florida';

UPDATE territories SET 
  address = '3456 Market St, St. Louis, MO 63101',
  phone = '(314) 555-0300'
WHERE name = 'East Missouri';

UPDATE territories SET 
  address = '7890 Main St, Kansas City, MO 64105',
  phone = '(816) 555-0400'
WHERE name = 'West Missouri';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_territories_address ON territories(address);

-- Verification query - uncomment to check results
-- SELECT id, name, region, address, phone, is_active FROM territories ORDER BY name; 