-- Check the exact email format in auth.users
SELECT 
  'auth.users' as source,
  email
FROM auth.users
WHERE LOWER(email) LIKE '%taylor.hilton%';

-- Check the exact email format in profiles
SELECT 
  'profiles' as source,
  email
FROM profiles
WHERE LOWER(email) LIKE '%taylor.hilton%';

-- If you need to update the email case to match what you're typing:
-- First, check if the email exists in lowercase
SELECT COUNT(*) as count FROM auth.users WHERE email = 'taylor.hilton@3mgroofing.com';

-- If it exists, you can either:
-- 1. Login with the lowercase version: taylor.hilton@3mgroofing.com
-- 2. Or update the email to match your typing (but this is risky in Supabase auth.users)

-- The safer approach is to just use the correct case when logging in
-- Based on the SQL results above, use the exact email case shown 