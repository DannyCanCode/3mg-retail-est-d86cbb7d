-- =============================================================
-- Taylor Profile Verification & Fix Script (FIXED VERSION)
-- This script will check Taylor's profile data and fix territory issues
-- =============================================================

-- 0. First, let's check what columns actually exist in the profiles table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 1. Check Taylor's complete profile data (using only existing columns)
SELECT 
  'Taylor Profile Data' as check_name,
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.territory_id,
  t.name as territory_name,
  p.completed_onboarding,
  p.created_at
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
  completed_onboarding = true
WHERE LOWER(email) = 'taylor.hilton@3mgroofing.com';

-- Fix 2: Ensure auth user is properly confirmed
UPDATE auth.users 
SET 
  email_confirmed_at = NOW()
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
-- DEBUGGING SECTION: Additional checks
-- =============================================================

-- Check what territories exist and their IDs
SELECT 
  'Territory IDs' as check_name,
  id,
  name
FROM territories
ORDER BY name;

-- Check if there are any other users with manager role for comparison
SELECT 
  'Other Managers' as check_name,
  email,
  role,
  territory_id,
  full_name
FROM profiles
WHERE role = 'manager'
LIMIT 5;

-- Check auth.users table structure
SELECT 
  'Auth Users Check' as check_name,
  email,
  email_confirmed_at IS NOT NULL as confirmed,
  created_at
FROM auth.users
WHERE LOWER(email) = 'taylor.hilton@3mgroofing.com';

-- =============================================================
-- TROUBLESHOOTING NOTES
-- =============================================================

/*
This fixed script:
1. Checks actual table structure first
2. Removes references to non-existent columns
3. Focuses on the core issue: role and territory_id

Key things to check:
- Role should be 'manager' (not 'rep')
- Territory_id should point to Winter Park territory UUID
- Email should be confirmed in auth.users
- Profile should be linked to auth.users via matching IDs

After running this script:
1. Have Taylor logout and login again
2. Clear browser cache
3. Check browser console for routing messages
4. Taylor should see Manager Dashboard, not Sales Dashboard
*/ 