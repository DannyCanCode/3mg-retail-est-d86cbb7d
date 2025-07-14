-- Create Taylor Hilton user in Supabase
-- This script creates both the auth user and profile

-- Function to create a user with email and password
CREATE OR REPLACE FUNCTION public.create_taylor_hilton()
RETURNS void AS $$
DECLARE
  user_id uuid;
  encrypted_pw text;
BEGIN
  -- Generate a UUID for the user
  user_id := gen_random_uuid();
  
  -- Encrypt the password
  encrypted_pw := crypt('Taylor2024!', gen_salt('bf'));

  -- Insert into auth.users table
  INSERT INTO auth.users
    (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  VALUES
    ('00000000-0000-0000-0000-000000000000', user_id, 'authenticated', 'authenticated', 'Taylor.Hilton@3MGRoofing.com', encrypted_pw, NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}');

  -- Insert into auth.identities table
  INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), user_id, format('{"sub":"%s","email":"%s"}', user_id::text, 'Taylor.Hilton@3MGRoofing.com')::jsonb, 'email', NOW(), NOW(), NOW());

  -- Insert into profiles table
  INSERT INTO public.profiles (id, email, full_name, role, territory, created_at, updated_at)
  VALUES
    (user_id, 'Taylor.Hilton@3MGRoofing.com', 'Taylor Hilton', 'project_manager', 'Winter Park', NOW(), NOW());

  RAISE NOTICE 'Taylor Hilton created successfully with ID: %', user_id;
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT public.create_taylor_hilton();

-- Clean up the function
DROP FUNCTION IF EXISTS public.create_taylor_hilton(); 