-- EMERGENCY FIX: Josh VanHorn Territory Manager Assignment
-- This script fixes Josh VanHorn being assigned wrong role/dashboard

-- Step 1: Get Tampa territory ID
SELECT id, name FROM territories WHERE name = 'Tampa';

-- Step 2: Update Josh VanHorn's profile to be Tampa Territory Manager
UPDATE profiles 
SET 
  role = 'manager',
  territory_id = (SELECT id FROM territories WHERE name = 'Tampa'),
  job_title = 'Tampa Territory Manager',
  completed_onboarding = true,
  updated_at = NOW()
WHERE email ILIKE 'josh.vanhorn@3mgroofing.com' 
   OR email ILIKE 'Josh.VanHorn@3MGRoofing.com';

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
WHERE p.email ILIKE '%josh.vanhorn%'
   OR p.email ILIKE '%Josh.VanHorn%';

-- Step 4: Show all territory managers for verification
SELECT 
  p.email,
  p.full_name,
  p.role,
  t.name as territory_name,
  p.job_title
FROM profiles p
LEFT JOIN territories t ON p.territory_id = t.id
WHERE p.role = 'manager'
ORDER BY t.name; 