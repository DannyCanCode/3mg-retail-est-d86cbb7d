-- 1. Check the exact email and user details in auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at,
  raw_user_meta_data
FROM auth.users
WHERE LOWER(email) LIKE '%taylor.hilton%';

-- 2. Check if the user is confirmed
SELECT 
  email,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN 'Confirmed'
    ELSE 'NOT CONFIRMED - This is the problem!'
  END as status
FROM auth.users
WHERE LOWER(email) LIKE '%taylor.hilton%';

-- 3. Check the profile exists
SELECT 
  p.id,
  p.email,
  p.role,
  p.full_name,
  t.name as territory_name
FROM profiles p
LEFT JOIN territories t ON p.territory_id = t.id
WHERE LOWER(p.email) LIKE '%taylor.hilton%';

-- 4. If the email is not confirmed, confirm it manually
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE LOWER(email) LIKE '%taylor.hilton%' 
  AND email_confirmed_at IS NULL;

-- 5. Verify the confirmation worked
SELECT email, email_confirmed_at FROM auth.users WHERE LOWER(email) LIKE '%taylor.hilton%'; 