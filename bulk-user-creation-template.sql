-- =============================================================
-- BULK USER CREATION TEMPLATE
-- Use this template to create multiple users quickly
-- =============================================================

-- STEP 1: Check available territories first
SELECT 
  'AVAILABLE TERRITORIES:' as info,
  id,
  name
FROM territories
ORDER BY name;

-- STEP 2: Template for creating a new user
-- Copy this section and modify for each new user

-- ============= USER CREATION TEMPLATE =============
-- COPY THIS SECTION FOR EACH NEW USER

-- Example: Create John Doe as sales rep in Tampa territory
/*
DO $$
DECLARE
  user_id uuid;
  encrypted_pw text;
  territory_uuid uuid;
BEGIN
  -- Generate UUID and encrypt password
  user_id := gen_random_uuid();
  encrypted_pw := crypt('TempPassword123!', gen_salt('bf'));
  
  -- Get territory ID (change territory name as needed)
  SELECT id INTO territory_uuid FROM territories WHERE name = 'Tampa';
  
  -- Create auth user
  INSERT INTO auth.users
    (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  VALUES
    ('00000000-0000-0000-0000-000000000000', user_id, 'authenticated', 'authenticated', 'john.doe@3mgroofing.com', encrypted_pw, NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}');

  -- Create identity
  INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), user_id, format('{"sub":"%s","email":"%s"}', user_id::text, 'john.doe@3mgroofing.com')::jsonb, 'email', NOW(), NOW(), NOW());

  -- Create profile
  INSERT INTO public.profiles (id, email, full_name, role, territory_id, completed_onboarding, created_at)
  VALUES
    (user_id, 'john.doe@3mgroofing.com', 'John Doe', 'rep', territory_uuid, true, NOW());

  RAISE NOTICE 'User created: % with role: % in territory: %', 'john.doe@3mgroofing.com', 'rep', territory_uuid;
END;
$$;
*/

-- ============= COMMON USER PATTERNS =============

-- PATTERN 1: Sales Rep (Project Manager)
-- Role: 'rep'
-- Territory: Assigned to specific territory
-- Dashboard: Sales Dashboard
-- Example: Taylor Hilton, other project managers

-- PATTERN 2: Territory Manager  
-- Role: 'manager'
-- Territory: Assigned to specific territory
-- Dashboard: Manager Dashboard
-- Example: Chase Lovejoy, Adam

-- PATTERN 3: Admin
-- Role: 'admin'
-- Territory: NULL (can access all territories)
-- Dashboard: Admin Dashboard
-- Example: System administrators

-- ============= BULK CREATION EXAMPLE =============
-- Here's how to create multiple users at once:

/*
-- Sales Rep Example
DO $$
DECLARE
  users_to_create JSONB := '[
    {"email": "mike.smith@3mgroofing.com", "name": "Mike Smith", "role": "rep", "territory": "Tampa", "password": "MikePass123!"},
    {"email": "sarah.jones@3mgroofing.com", "name": "Sarah Jones", "role": "rep", "territory": "Miami", "password": "SarahPass123!"},
    {"email": "david.brown@3mgroofing.com", "name": "David Brown", "role": "manager", "territory": "Ocala", "password": "DavidPass123!"}
  ]';
  user_data JSONB;
  user_id uuid;
  encrypted_pw text;
  territory_uuid uuid;
BEGIN
  FOR user_data IN SELECT * FROM jsonb_array_elements(users_to_create)
  LOOP
    user_id := gen_random_uuid();
    encrypted_pw := crypt(user_data->>'password', gen_salt('bf'));
    
    -- Get territory ID (skip for admin)
    IF user_data->>'role' != 'admin' THEN
      SELECT id INTO territory_uuid FROM territories WHERE name = user_data->>'territory';
    ELSE
      territory_uuid := NULL;
    END IF;
    
    -- Create auth user
    INSERT INTO auth.users
      (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES
      ('00000000-0000-0000-0000-000000000000', user_id, 'authenticated', 'authenticated', user_data->>'email', encrypted_pw, NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}');

    -- Create identity
    INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES
      (gen_random_uuid(), user_id, format('{"sub":"%s","email":"%s"}', user_id::text, user_data->>'email')::jsonb, 'email', NOW(), NOW(), NOW());

    -- Create profile
    INSERT INTO public.profiles (id, email, full_name, role, territory_id, completed_onboarding, created_at)
    VALUES
      (user_id, user_data->>'email', user_data->>'name', user_data->>'role', territory_uuid, true, NOW());

    RAISE NOTICE 'Created user: % (%) in % territory', user_data->>'name', user_data->>'role', user_data->>'territory';
  END LOOP;
END;
$$;
*/

-- ============= VERIFICATION QUERIES =============
-- Use these to verify users were created correctly

-- Check all users by territory
SELECT 
  'ALL USERS BY TERRITORY:' as info,
  t.name as territory,
  p.email,
  p.full_name,
  p.role,
  p.completed_onboarding
FROM profiles p
LEFT JOIN territories t ON p.territory_id = t.id
ORDER BY t.name, p.role DESC, p.full_name;

-- Check auth status for all users
SELECT 
  'AUTH STATUS CHECK:' as info,
  u.email,
  u.email_confirmed_at IS NOT NULL as confirmed,
  p.role,
  p.full_name
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE LOWER(u.email) LIKE '%@3mgroofing.com'
ORDER BY p.role DESC, u.email;

-- =============================================================
-- USAGE INSTRUCTIONS:
-- =============================================================
/*
1. First run the territory check to see available territories
2. Copy the user creation template for each new user
3. Modify: email, name, role, territory, password
4. Run the creation script
5. Use verification queries to confirm users were created
6. Test login with each new user

ROLES:
- 'rep' = Sales Rep (Project Manager) - sees Sales Dashboard
- 'manager' = Territory Manager - sees Manager Dashboard  
- 'admin' = Administrator - sees Admin Dashboard

TERRITORIES:
- Tampa, Ocala, Winter Park, Miami
- Sales reps and managers need territory assignment
- Admins can access all territories (territory_id = NULL)

PASSWORDS:
- Use strong temporary passwords
- Users should change on first login
- Format: NamePass123! (easy to remember for first login)
*/ 