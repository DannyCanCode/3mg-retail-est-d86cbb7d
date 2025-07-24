-- =============================================================
-- FIX TERRITORY ASSIGNMENTS MIGRATION
-- Ensures all managers and reps have proper territory_id assignments
-- =============================================================

-- Update Josh VanHorn - Southwest Florida
UPDATE profiles p
SET territory_id = t.id
FROM territories t
WHERE LOWER(p.email) = 'josh.vanhorn@3mgroofing.com'
AND t.name = 'Southwest Florida';

-- Update Jacob Kallhoff - North Central Florida
UPDATE profiles p
SET territory_id = t.id
FROM territories t
WHERE LOWER(p.email) = 'jacob.kallhoff@3mgroofing.com'
AND t.name = 'North Central Florida';

-- Update Chase Lovejoy - Central Florida
UPDATE profiles p
SET territory_id = t.id
FROM territories t
WHERE LOWER(p.email) = 'chase.lovejoy@3mgroofing.com'
AND t.name = 'Central Florida';

-- Update Adam - Central Florida
UPDATE profiles p
SET territory_id = t.id
FROM territories t
WHERE LOWER(p.email) = 'adam@3mgroofing.com'
AND t.name = 'Central Florida';

-- Update DM Pearl - South Florida
UPDATE profiles p
SET territory_id = t.id
FROM territories t
WHERE LOWER(p.email) = 'dmpearl@3mgroofing.com'
AND t.name = 'South Florida';

-- Update Nickolas Nell - Southeast Florida
UPDATE profiles p
SET territory_id = t.id
FROM territories t
WHERE LOWER(p.email) = 'nickolas.nell@3mgroofing.com'
AND t.name = 'Southeast Florida';

-- Update Harrison Cremata - Northeast Florida
UPDATE profiles p
SET territory_id = t.id
FROM territories t
WHERE LOWER(p.email) = 'harrison.cremata@3mgroofing.com'
AND t.name = 'Northeast Florida';

-- Update Taylor Hilton - Central Florida (sales rep)
UPDATE profiles p
SET territory_id = t.id
FROM territories t
WHERE LOWER(p.email) IN ('taylor.hilton@3mgroofing.com', 'taylor@3mgretailestimator.com')
AND t.name = 'Central Florida';

-- Add job titles for managers
UPDATE profiles SET job_title = 'Southwest Florida Territory Manager' 
WHERE LOWER(email) = 'josh.vanhorn@3mgroofing.com';

UPDATE profiles SET job_title = 'North Central Florida Territory Manager' 
WHERE LOWER(email) = 'jacob.kallhoff@3mgroofing.com';

UPDATE profiles SET job_title = 'Central Florida Territory Manager' 
WHERE LOWER(email) IN ('chase.lovejoy@3mgroofing.com', 'adam@3mgroofing.com');

UPDATE profiles SET job_title = 'South Florida Territory Manager' 
WHERE LOWER(email) = 'dmpearl@3mgroofing.com';

UPDATE profiles SET job_title = 'Southeast Florida Territory Manager' 
WHERE LOWER(email) = 'nickolas.nell@3mgroofing.com';

UPDATE profiles SET job_title = 'Northeast Florida Territory Manager' 
WHERE LOWER(email) = 'harrison.cremata@3mgroofing.com';

-- Ensure all managers have completed onboarding
UPDATE profiles 
SET completed_onboarding = true 
WHERE role = 'manager' 
AND completed_onboarding IS NOT true; 