-- Fix Taylor Hilton's territory assignment
-- This script ensures Taylor has the proper territory_id for Winter Park

-- First, check current state
SELECT 
  id,
  email,
  full_name,
  role,
  territory_id,
  completed_onboarding
FROM profiles
WHERE LOWER(email) = 'taylor.hilton@3mgroofing.com';

-- Update Taylor's profile with the correct territory_id for Winter Park
UPDATE profiles
SET 
  territory_id = 'a221805b-0b50-493f-97af-3a8d6367bb4e', -- Winter Park territory UUID
  role = 'project_manager', -- Ensure role is correct
  completed_onboarding = true, -- Ensure onboarding is marked complete
  updated_at = NOW()
WHERE LOWER(email) = 'taylor.hilton@3mgroofing.com';

-- Verify the update
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.territory_id,
  t.name as territory_name,
  p.completed_onboarding
FROM profiles p
LEFT JOIN territories t ON p.territory_id = t.id
WHERE LOWER(p.email) = 'taylor.hilton@3mgroofing.com';

-- Also ensure the auth.users email matches exactly (case-sensitive)
UPDATE auth.users
SET email = 'taylor.hilton@3mgroofing.com'
WHERE LOWER(email) = 'taylor.hilton@3mgroofing.com';

-- Final verification
SELECT 
  'Profile' as source,
  email,
  role,
  territory_id
FROM profiles
WHERE LOWER(email) = 'taylor.hilton@3mgroofing.com'
UNION ALL
SELECT 
  'Auth User' as source,
  email,
  'N/A' as role,
  'N/A' as territory_id
FROM auth.users
WHERE LOWER(email) = 'taylor.hilton@3mgroofing.com'; 