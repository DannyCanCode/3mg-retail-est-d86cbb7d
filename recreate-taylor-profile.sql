-- =============================================================
-- RECREATE TAYLOR PROFILE SCRIPT
-- Since UPDATE didn't work, we'll delete and recreate the profile
-- =============================================================

-- Step 1: Check Taylor's current broken state
SELECT 
  'TAYLOR BEFORE RECREATION:' as info,
  id,
  email,
  role,
  full_name,
  territory_id,
  completed_onboarding
FROM profiles
WHERE LOWER(email) = 'taylor.hilton@3mgroofing.com';

-- Step 2: Check Winter Park territory ID
SELECT 
  'WINTER PARK ID:' as info,
  id,
  name
FROM territories
WHERE name = 'Winter Park';

-- Step 3: Get Taylor's auth user ID (we need this for the new profile)
SELECT 
  'TAYLOR AUTH USER ID:' as info,
  id,
  email,
  email_confirmed_at IS NOT NULL as confirmed
FROM auth.users
WHERE LOWER(email) = 'taylor.hilton@3mgroofing.com';

-- Step 4: DELETE the broken profile
DELETE FROM profiles 
WHERE LOWER(email) = 'taylor.hilton@3mgroofing.com';

-- Step 5: RECREATE Taylor's profile with correct data
INSERT INTO profiles (
  id, 
  email, 
  full_name, 
  role, 
  territory_id, 
  completed_onboarding,
  created_at
)
SELECT 
  u.id,
  'taylor.hilton@3mgroofing.com',
  'Taylor Hilton',
  'rep',
  (SELECT id FROM territories WHERE name = 'Winter Park'),
  true,
  NOW()
FROM auth.users u
WHERE LOWER(u.email) = 'taylor.hilton@3mgroofing.com';

-- Step 6: Verify the recreation worked
SELECT 
  'TAYLOR AFTER RECREATION:' as info,
  id,
  email,
  role,
  full_name,
  territory_id,
  completed_onboarding,
  CASE 
    WHEN role = 'rep' AND territory_id IS NOT NULL AND full_name IS NOT NULL THEN 'SUCCESS - Profile recreated!'
    WHEN role IS NULL THEN 'FAILED - Role still NULL'
    WHEN territory_id IS NULL THEN 'FAILED - Territory still NULL'
    WHEN full_name IS NULL THEN 'FAILED - Full name still NULL'
    ELSE 'UNKNOWN STATUS'
  END as status
FROM profiles
WHERE email = 'taylor.hilton@3mgroofing.com';

-- Step 7: Show Winter Park team to confirm Taylor is now part of it
SELECT 
  'WINTER PARK TEAM WITH TAYLOR:' as info,
  p.email,
  p.role,
  p.full_name,
  t.name as territory,
  CASE 
    WHEN p.role = 'manager' THEN 'TERRITORY MANAGER'
    WHEN p.role = 'rep' THEN 'SALES REP'
    ELSE p.role
  END as role_description
FROM profiles p
JOIN territories t ON p.territory_id = t.id
WHERE t.name = 'Winter Park'
ORDER BY p.role DESC, p.full_name;

-- Step 8: Final verification with auth linkage
SELECT 
  'FINAL AUTH VERIFICATION:' as info,
  u.email,
  u.email_confirmed_at IS NOT NULL as confirmed,
  p.role,
  p.full_name,
  t.name as territory,
  CASE 
    WHEN p.role = 'rep' AND t.name = 'Winter Park' THEN 'READY FOR SALES DASHBOARD'
    WHEN p.role IS NULL THEN 'PROFILE BROKEN'
    WHEN t.name IS NULL THEN 'NO TERRITORY ASSIGNED'
    ELSE 'UNKNOWN STATUS'
  END as final_status
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN territories t ON p.territory_id = t.id
WHERE LOWER(u.email) = 'taylor.hilton@3mgroofing.com';

-- =============================================================
-- WHAT THIS SCRIPT DOES:
-- =============================================================
/*
This script:
1. Deletes Taylor's broken profile (role = NULL, full_name = NULL)
2. Recreates the profile with correct data from auth.users
3. Sets role = 'rep', full_name = 'Taylor Hilton', territory = Winter Park
4. Verifies the recreation worked
5. Shows Winter Park team structure with Taylor included

After running this:
- Taylor should have a working profile with role = 'rep'
- He should be assigned to Winter Park territory
- He should appear in Winter Park team alongside Chase and Adam
- He should be able to access Sales Dashboard without errors

Next steps after running this script:
1. Have Taylor logout completely
2. Clear browser cache
3. Login again with taylor.hilton@3mgroofing.com / Taylor2024!
4. Taylor should now see Sales Dashboard successfully
*/ 