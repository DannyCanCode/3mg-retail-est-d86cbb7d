-- EMERGENCY FIX: DM Pearl Miami Territory Manager Assignment
-- This script fixes DM Pearl being assigned wrong role/dashboard

-- Step 1: Get Miami territory ID
SELECT id, name FROM territories WHERE name = 'Miami';

-- Step 2: Update DM Pearl's profile to be Miami Territory Manager
UPDATE profiles 
SET 
  role = 'manager',
  territory_id = (SELECT id FROM territories WHERE name = 'Miami'),
  job_title = 'Miami Territory Manager',
  completed_onboarding = true,
  updated_at = NOW()
WHERE email ILIKE 'dmpearl@3mgroofing.com' 
   OR email ILIKE 'dmpearl@3MGRoofing.com';

-- Step 3: Verify the fix worked
SELECT 
  p.email,
  p.full_name,
  p.role,
  t.name as territory_name,
  p.job_title,
  p.completed_onboarding
FROM profiles p
LEFT JOIN territories t ON p.territory_id = t.id
WHERE p.email ILIKE '%dmpearl%';

-- Step 4: Show all Territory Managers for verification
SELECT 
  p.email,
  p.full_name,
  p.role,
  t.name as territory_name,
  p.job_title
FROM profiles p
LEFT JOIN territories t ON p.territory_id = t.id
WHERE p.role = 'manager'
ORDER BY t.name, p.email; 