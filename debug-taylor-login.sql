-- =============================================================
-- Taylor Hilton Login Debug & Fix Script
-- This script will diagnose and fix Taylor's login issues
-- =============================================================

-- 1. Check if Taylor exists in auth.users
SELECT 
  'Step 1: Check auth.users' as step,
  COUNT(*) as count,
  ARRAY_AGG(email) as emails
FROM auth.users 
WHERE LOWER(email) LIKE '%taylor%hilton%';

-- 2. Check if Taylor exists in profiles
SELECT 
  'Step 2: Check profiles' as step,
  COUNT(*) as count,
  ARRAY_AGG(email) as emails
FROM profiles 
WHERE LOWER(email) LIKE '%taylor%hilton%';

-- 3. Check available territories (we need the UUID for Winter Park)
SELECT 
  'Step 3: Available territories' as step,
  id,
  name,
  region
FROM territories
WHERE is_active = true
ORDER BY name;

-- 4. Check if there's a role mismatch
SELECT 
  'Step 4: Role check' as step,
  p.email,
  p.role,
  p.territory_id,
  t.name as territory_name
FROM profiles p
LEFT JOIN territories t ON p.territory_id = t.id
WHERE LOWER(p.email) LIKE '%taylor%hilton%';

-- =============================================================
-- FIX SECTION: Remove existing user and create properly
-- =============================================================

-- Clean up existing data
DELETE FROM profiles WHERE LOWER(email) LIKE '%taylor%hilton%';
DELETE FROM auth.users WHERE LOWER(email) LIKE '%taylor%hilton%';

-- Create Taylor Hilton user with proper structure
DO $$
DECLARE
  user_id uuid;
  encrypted_pw text;
  winter_park_id uuid;
BEGIN
  -- Generate a UUID for the user
  user_id := gen_random_uuid();
  
  -- Encrypt the password
  encrypted_pw := crypt('Taylor2024!', gen_salt('bf'));
  
  -- Get Winter Park territory ID
  SELECT id INTO winter_park_id FROM territories WHERE name = 'Winter Park';
  
  -- Insert into auth.users table
  INSERT INTO auth.users
    (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  VALUES
    ('00000000-0000-0000-0000-000000000000', user_id, 'authenticated', 'authenticated', 'taylor.hilton@3mgroofing.com', encrypted_pw, NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}');

  -- Insert into auth.identities table
  INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), user_id, format('{"sub":"%s","email":"%s"}', user_id::text, 'taylor.hilton@3mgroofing.com')::jsonb, 'email', NOW(), NOW(), NOW());

  -- Insert into profiles table with correct column names
  INSERT INTO public.profiles (id, email, full_name, role, territory_id, created_at, updated_at)
  VALUES
    (user_id, 'taylor.hilton@3mgroofing.com', 'Taylor Hilton', 'manager', winter_park_id, NOW(), NOW());

  RAISE NOTICE 'Taylor Hilton created successfully with ID: % and territory: %', user_id, winter_park_id;
END;
$$;

-- =============================================================
-- VERIFICATION SECTION
-- =============================================================

-- 5. Verify the user was created correctly
SELECT 
  'Step 5: Verify auth.users creation' as step,
  u.id,
  u.email,
  u.encrypted_password IS NOT NULL as has_password,
  u.email_confirmed_at IS NOT NULL as email_confirmed,
  u.created_at
FROM auth.users u
WHERE LOWER(u.email) = 'taylor.hilton@3mgroofing.com';

-- 6. Verify the profile was created correctly
SELECT 
  'Step 6: Verify profile creation' as step,
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.territory_id,
  t.name as territory_name
FROM profiles p
LEFT JOIN territories t ON p.territory_id = t.id
WHERE LOWER(p.email) = 'taylor.hilton@3mgroofing.com';

-- 7. Test password hash (should return true)
SELECT 
  'Step 7: Test password hash' as step,
  u.email,
  (u.encrypted_password = crypt('Taylor2024!', u.encrypted_password)) as password_matches
FROM auth.users u
WHERE LOWER(u.email) = 'taylor.hilton@3mgroofing.com';

-- 8. Final verification - all should be properly linked
SELECT 
  'Step 8: Final verification' as step,
  u.email as auth_email,
  p.email as profile_email,
  p.full_name,
  p.role,
  t.name as territory,
  u.email_confirmed_at IS NOT NULL as email_confirmed
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN territories t ON p.territory_id = t.id
WHERE LOWER(u.email) = 'taylor.hilton@3mgroofing.com';

-- =============================================================
-- TROUBLESHOOTING NOTES
-- =============================================================

/*
Common login issues and fixes:

1. Case sensitivity: Use exact case 'taylor.hilton@3mgroofing.com' for login
2. Email not confirmed: Set email_confirmed_at to NOW() in auth.users
3. Missing profile: Profile record must exist and be linked to auth.users.id
4. Wrong territory: Use territory_id (UUID) not territory (string)
5. Password hash: Must use crypt() function with proper salt

To test login:
1. Use email: taylor.hilton@3mgroofing.com
2. Use password: Taylor2024!
3. Make sure development server is running
4. Check browser console for errors
5. Verify Supabase environment variables are set

If login still fails, check:
- .env.local file has correct VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- Development server is running on correct port
- Network requests are reaching Supabase (check Network tab)
*/ 