-- Update Taylor Hilton's profile to project_manager role
UPDATE profiles 
SET 
  role = 'project_manager',
  territory = 'Winter Park',
  full_name = 'Taylor Hilton',
  updated_at = NOW()
WHERE email = 'taylor.hilton@3mgroofing.com';

-- Verify the update
SELECT id, email, full_name, role, territory 
FROM profiles 
WHERE email = 'taylor.hilton@3mgroofing.com'; 