-- First, check what columns exist in the profiles table
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- Get the Winter Park territory ID
SELECT id, name FROM territories WHERE name = 'Winter Park';

-- Update Taylor Hilton's profile to project_manager role (without updated_at)
UPDATE profiles 
SET 
  role = 'project_manager',
  territory_id = (SELECT id FROM territories WHERE name = 'Winter Park'),
  full_name = 'Taylor Hilton'
WHERE email = 'taylor.hilton@3mgroofing.com';

-- Verify the update
SELECT 
  p.id, 
  p.email, 
  p.full_name, 
  p.role, 
  p.territory_id,
  t.name as territory_name
FROM profiles p
LEFT JOIN territories t ON p.territory_id = t.id
WHERE p.email = 'taylor.hilton@3mgroofing.com'; 