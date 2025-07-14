-- =============================================================
-- SIMPLE TAYLOR FIX SCRIPT
-- This script checks actual table structure first, then fixes Taylor
-- =============================================================

-- Step 1: Check what columns actually exist in each table
SELECT 'PROFILES TABLE COLUMNS:' as info;
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'TERRITORIES TABLE COLUMNS:' as info;
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'territories' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Check Taylor's current profile (using basic columns)
SELECT 
  'TAYLOR CURRENT PROFILE:' as info,
  id,
  email,
  role,
  territory_id,
  full_name,
  completed_onboarding
FROM profiles
WHERE LOWER(email) = 'taylor.hilton@3mgroofing.com';

-- Step 3: Check available territories (using basic columns)
SELECT 
  'AVAILABLE TERRITORIES:' as info,
  id,
  name
FROM territories
ORDER BY name;

-- Step 4: Get Winter Park territory ID
SELECT 
  'WINTER PARK TERRITORY ID:' as info,
  id,
  name
FROM territories
WHERE name = 'Winter Park';

-- Step 5: SIMPLE FIX - Update Taylor's profile
UPDATE profiles 
SET 
  role = 'manager',
  territory_id = (SELECT id FROM territories WHERE name = 'Winter Park'),
  full_name = 'Taylor Hilton',
  completed_onboarding = true
WHERE LOWER(email) = 'taylor.hilton@3mgroofing.com';

-- Step 6: Verify the fix worked
SELECT 
  'TAYLOR AFTER FIX:' as info,
  p.id,
  p.email,
  p.role,
  p.territory_id,
  t.name as territory_name,
  p.completed_onboarding,
  CASE 
    WHEN p.role = 'manager' AND p.territory_id IS NOT NULL THEN 'SHOULD SEE MANAGER DASHBOARD'
    WHEN p.role = 'rep' THEN 'WOULD SEE SALES DASHBOARD'
    WHEN p.territory_id IS NULL THEN 'WOULD SEE TERRITORY ASSIGNMENT ERROR'
    ELSE 'UNKNOWN STATUS'
  END as expected_behavior
FROM profiles p
LEFT JOIN territories t ON p.territory_id = t.id
WHERE LOWER(p.email) = 'taylor.hilton@3mgroofing.com';

-- Step 7: Confirm auth user is set up correctly
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE LOWER(email) = 'taylor.hilton@3mgroofing.com' 
  AND email_confirmed_at IS NULL;

SELECT 
  'AUTH USER STATUS:' as info,
  email,
  email_confirmed_at IS NOT NULL as email_confirmed
FROM auth.users
WHERE LOWER(email) = 'taylor.hilton@3mgroofing.com';

-- =============================================================
-- WHAT THIS SCRIPT DOES:
-- =============================================================
/*
1. Shows actual table structure so we know what columns exist
2. Shows Taylor's current profile data
3. Shows available territories
4. Updates Taylor to be a manager in Winter Park territory
5. Verifies the fix worked
6. Confirms email is verified

After running this:
- Taylor should have role = 'manager'
- Taylor should have territory_id pointing to Winter Park
- Taylor should see Manager Dashboard, not Sales Dashboard
- No more "Territory Assignment Required" error

Next steps:
1. Run this script
2. Have Taylor logout and login again
3. Clear browser cache
4. Check if Taylor now sees Manager Dashboard
*/ 