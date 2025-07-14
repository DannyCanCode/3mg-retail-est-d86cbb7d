-- =============================================================
-- Taylor Profile Verification & Fix Script
-- This script will check Taylor's profile data and fix territory issues
-- =============================================================

-- 1. Check Taylor's complete profile data
SELECT 
  'Taylor Profile Data' as check_name,
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.territory_id,
  t.name as territory_name,
  p.completed_onboarding,
  p.created_at,
  p.updated_at
FROM profiles p
LEFT JOIN territories t ON p.territory_id = t.id
WHERE LOWER(p.email) = 'taylor.hilton@3mgroofing.com';

-- 2. Check if Taylor is properly linked to auth.users
SELECT 
  'Auth User Link Check' as check_name,
  u.id as auth_user_id,
  u.email as auth_email,
  u.email_confirmed_at IS NOT NULL as email_confirmed,
  p.id as profile_id,
  p.email as profile_email,
  p.territory_id,
  t.name as territory_name
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN territories t ON p.territory_id = t.id
WHERE LOWER(u.email) = 'taylor.hilton@3mgroofing.com';

-- 3. Check available territories (to see what Winter Park ID should be)
SELECT 
  'Available Territories' as check_name,
  id,
  name,
  region,
  is_active
FROM territories
WHERE is_active = true
ORDER BY name;

-- 4. Check if Taylor's role is correct (should be 'manager')
SELECT 
  'Role Check' as check_name,
  role,
  CASE 
    WHEN role = 'manager' THEN 'Correct - should access manager dashboard'
    WHEN role = 'rep' THEN 'Incorrect - should be manager, not rep'
    WHEN role = 'admin' THEN 'Unexpected - should be manager'
    ELSE 'Unknown role'
  END as role_status
FROM profiles
WHERE LOWER(email) = 'taylor.hilton@3mgroofing.com';

-- =============================================================
-- FIX SECTION: Update Taylor's profile if needed
-- =============================================================

-- Fix 1: Ensure Taylor has the correct territory_id for Winter Park
UPDATE profiles 
SET 
  territory_id = (SELECT id FROM territories WHERE name = 'Winter Park'),
  role = 'manager',
  full_name = 'Taylor Hilton',
  completed_onboarding = true,
  updated_at = NOW()
WHERE LOWER(email) = 'taylor.hilton@3mgroofing.com';

-- Fix 2: Ensure auth user is properly confirmed
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  updated_at = NOW()
WHERE LOWER(email) = 'taylor.hilton@3mgroofing.com' 
  AND email_confirmed_at IS NULL;

-- =============================================================
-- VERIFICATION SECTION: Check fixes were applied
-- =============================================================

-- Final verification of Taylor's profile
SELECT 
  'Final Verification' as check_name,
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.territory_id,
  t.name as territory_name,
  p.completed_onboarding,
  u.email_confirmed_at IS NOT NULL as email_confirmed,
  CASE 
    WHEN p.territory_id IS NOT NULL AND p.role = 'manager' THEN 'Ready for Manager Dashboard'
    WHEN p.territory_id IS NULL THEN 'Missing Territory Assignment'
    WHEN p.role != 'manager' THEN 'Incorrect Role'
    ELSE 'Unknown Issue'
  END as status
FROM profiles p
LEFT JOIN territories t ON p.territory_id = t.id
LEFT JOIN auth.users u ON p.id = u.id
WHERE LOWER(p.email) = 'taylor.hilton@3mgroofing.com';

-- =============================================================
-- TROUBLESHOOTING NOTES
-- =============================================================

/*
Expected Results:
- Taylor should have role = 'manager'
- Taylor should have territory_id pointing to Winter Park territory
- Taylor should have completed_onboarding = true
- Auth user should have email_confirmed_at set

Dashboard Routing Logic:
- If role = 'manager' AND territory_id EXISTS → Manager Dashboard
- If role = 'manager' AND territory_id IS NULL → "Territory Assignment Required" error
- If role = 'rep' → Sales Rep Dashboard
- If role = 'admin' → Admin Dashboard

The "Territory Assignment Required" message appears when:
1. User role is NOT 'admin' AND
2. profile.territory_id is NULL or undefined

Common Issues:
1. Profile not loading correctly in auth context
2. Territory_id is NULL in database
3. Role is incorrect (should be 'manager' not 'rep')
4. Browser cache showing old profile data
*/ 