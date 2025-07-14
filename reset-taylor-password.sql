-- As a last resort, we can create a new user with the exact credentials
-- First, let's get the current user ID and details
SELECT id, email FROM auth.users WHERE LOWER(email) LIKE '%taylor.hilton%';

-- Option 1: Delete and recreate (USE WITH CAUTION)
-- This will delete the existing user and create a new one

-- Step 1: Delete from profiles first (due to foreign key)
DELETE FROM profiles WHERE LOWER(email) LIKE '%taylor.hilton%';

-- Step 2: Delete from auth.users
DELETE FROM auth.users WHERE LOWER(email) LIKE '%taylor.hilton%';

-- Step 3: Create new user properly (you'll need to do this through Supabase Dashboard)
-- Go to Authentication > Users > Add User
-- Email: taylor.hilton@3mgroofing.com
-- Password: Taylor2024!
-- Check "Auto Confirm User" ✓

-- After creating in dashboard, update the profile:
UPDATE profiles 
SET 
  role = 'project_manager',
  territory_id = (SELECT id FROM territories WHERE name = 'Winter Park'),
  full_name = 'Taylor Hilton'
WHERE email = 'taylor.hilton@3mgroofing.com'; 