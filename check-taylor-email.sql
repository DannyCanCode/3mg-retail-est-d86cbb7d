-- Check the exact email format in both auth.users and profiles
SELECT 
  'AUTH.USERS' as table_name,
  id,
  email
FROM auth.users
WHERE LOWER(email) LIKE '%taylor.hilton%'
UNION ALL
SELECT 
  'PROFILES' as table_name,
  id::text,
  email
FROM profiles
WHERE LOWER(email) LIKE '%taylor.hilton%';

-- If the email is lowercase in the database, we need to update it to match the case-sensitive login
-- Option 1: Update to match the case you're trying to use (capital H)
UPDATE auth.users
SET email = 'Taylor.Hilton@3MGRoofing.com'
WHERE LOWER(email) = 'taylor.hilton@3mgroofing.com';

UPDATE profiles
SET email = 'Taylor.Hilton@3MGRoofing.com'
WHERE LOWER(email) = 'taylor.hilton@3mgroofing.com';

-- Verify the update
SELECT email FROM auth.users WHERE LOWER(email) LIKE '%taylor.hilton%';
SELECT email FROM profiles WHERE LOWER(email) LIKE '%taylor.hilton%'; 