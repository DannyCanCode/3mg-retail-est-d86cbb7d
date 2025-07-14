-- =============================================================
-- FIX TAYLOR AS SALES REP SCRIPT
-- Taylor is a sales rep (project manager) under Chase/Adam in Winter Park
-- =============================================================

-- Step 1: Check Taylor's current profile
SELECT 
  'TAYLOR CURRENT STATUS:' as info,
  id,
  email,
  role,
  territory_id,
  full_name,
  completed_onboarding
FROM profiles
WHERE LOWER(email) = 'taylor.hilton@3mgroofing.com';

-- Step 2: Check Winter Park territory ID
SELECT 
  'WINTER PARK TERRITORY:' as info,
  id,
  name
FROM territories
WHERE name = 'Winter Park';

-- Step 3: Check other Winter Park users (Chase, Adam)
SELECT 
  'WINTER PARK TEAM:' as info,
  email,
  role,
  full_name,
  territory_id
FROM profiles p
JOIN territories t ON p.territory_id = t.id
WHERE t.name = 'Winter Park'
ORDER BY role DESC, full_name;

-- Step 4: FIX TAYLOR - Set him as sales rep in Winter Park
UPDATE profiles 
SET 
  role = 'rep',                -- Sales rep role (project manager)
  territory_id = (SELECT id FROM territories WHERE name = 'Winter Park'),
  full_name = 'Taylor Hilton',
  completed_onboarding = true
WHERE LOWER(email) = 'taylor.hilton@3mgroofing.com';

-- Step 5: Verify Taylor is now set up correctly
SELECT 
  'TAYLOR AFTER FIX:' as info,
  p.id,
  p.email,
  p.role,
  p.territory_id,
  t.name as territory_name,
  p.completed_onboarding,
  CASE 
    WHEN p.role = 'rep' AND p.territory_id IS NOT NULL THEN 'SHOULD SEE SALES DASHBOARD - NO ERRORS'
    WHEN p.role = 'rep' AND p.territory_id IS NULL THEN 'WOULD SEE TERRITORY ASSIGNMENT ERROR'
    WHEN p.role = 'manager' THEN 'WOULD SEE MANAGER DASHBOARD'
    ELSE 'UNKNOWN STATUS'
  END as expected_behavior
FROM profiles p
LEFT JOIN territories t ON p.territory_id = t.id
WHERE LOWER(p.email) = 'taylor.hilton@3mgroofing.com';

-- Step 6: Show final Winter Park team structure
SELECT 
  'FINAL WINTER PARK TEAM:' as info,
  email,
  role,
  full_name,
  CASE 
    WHEN role = 'manager' THEN 'TERRITORY MANAGER'
    WHEN role = 'rep' THEN 'SALES REP'
    ELSE role
  END as role_description
FROM profiles p
JOIN territories t ON p.territory_id = t.id
WHERE t.name = 'Winter Park'
ORDER BY role DESC, full_name;

-- =============================================================
-- WHAT THIS SCRIPT DOES:
-- =============================================================
/*
CORRECT SETUP:
- Taylor Hilton: role = 'rep', territory_id = Winter Park
- Chase Lovejoy: role = 'manager', territory_id = Winter Park  
- Adam: role = 'manager', territory_id = Winter Park

AFTER RUNNING THIS:
- Taylor will be a sales rep in Winter Park territory
- He'll see the Sales Dashboard (not Manager Dashboard)
- No more "Territory Assignment Required" error
- He'll be under Chase and Adam as territory managers

NEXT STEPS:
1. Run this script
2. Have Taylor logout and login again
3. Clear browser cache
4. Taylor should now see Sales Dashboard without errors
5. He'll be able to create estimates as a sales rep
*/ 