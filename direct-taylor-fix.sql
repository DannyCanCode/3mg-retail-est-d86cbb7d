-- =============================================================
-- DIRECT TAYLOR FIX - Fix NULL role and full_name
-- =============================================================

-- First, let's see Taylor's current exact state
SELECT 
  'TAYLOR BEFORE FIX:' as info,
  id,
  email,
  role,
  full_name,
  territory_id,
  completed_onboarding
FROM profiles
WHERE LOWER(email) = 'taylor.hilton@3mgroofing.com';

-- Check what Winter Park territory ID is
SELECT 
  'WINTER PARK ID:' as info,
  id,
  name
FROM territories
WHERE name = 'Winter Park';

-- DIRECT FIX - Update Taylor's profile with explicit values
UPDATE profiles 
SET 
  role = 'rep',
  full_name = 'Taylor Hilton',
  territory_id = (
    SELECT id 
    FROM territories 
    WHERE name = 'Winter Park' 
    LIMIT 1
  ),
  completed_onboarding = true
WHERE email = 'taylor.hilton@3mgroofing.com';

-- Verify the update worked
SELECT 
  'TAYLOR AFTER FIX:' as info,
  id,
  email,
  role,
  full_name,
  territory_id,
  completed_onboarding,
  CASE 
    WHEN role = 'rep' AND territory_id IS NOT NULL THEN 'FIXED - Should work now!'
    WHEN role IS NULL THEN 'STILL BROKEN - Role is NULL'
    WHEN territory_id IS NULL THEN 'STILL BROKEN - Territory is NULL'
    ELSE 'UNKNOWN STATUS'
  END as status
FROM profiles
WHERE email = 'taylor.hilton@3mgroofing.com';

-- Show Winter Park team to confirm structure
SELECT 
  'WINTER PARK TEAM:' as info,
  p.email,
  p.role,
  p.full_name,
  t.name as territory
FROM profiles p
JOIN territories t ON p.territory_id = t.id
WHERE t.name = 'Winter Park'
ORDER BY p.role DESC, p.full_name;

-- Final verification - check auth users table too
SELECT 
  'AUTH VERIFICATION:' as info,
  u.email,
  u.email_confirmed_at IS NOT NULL as confirmed,
  p.role,
  p.full_name,
  t.name as territory
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN territories t ON p.territory_id = t.id
WHERE LOWER(u.email) = 'taylor.hilton@3mgroofing.com';

-- If Taylor still has issues, try this alternative approach
-- (Run this if the above doesn't work)
/*
-- Alternative: Delete and recreate Taylor's profile
DELETE FROM profiles WHERE email = 'taylor.hilton@3mgroofing.com';

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
*/ 