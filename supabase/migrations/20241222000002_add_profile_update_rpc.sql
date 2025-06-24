-- Create RPC function to update user profiles with elevated permissions
-- This function runs with SECURITY DEFINER which bypasses RLS

CREATE OR REPLACE FUNCTION update_user_profile(
  user_id UUID,
  profile_data JSONB
)
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_profile profiles;
BEGIN
  -- Update the profile with the provided data
  UPDATE profiles 
  SET 
    full_name = COALESCE((profile_data->>'full_name')::text, full_name),
    job_title = COALESCE((profile_data->>'job_title')::text, job_title),
    phone_number = COALESCE((profile_data->>'phone_number')::text, phone_number),
    completed_onboarding = COALESCE((profile_data->>'completed_onboarding')::boolean, completed_onboarding),
    territory_id = CASE 
      WHEN profile_data ? 'territory_id' THEN (profile_data->>'territory_id')::uuid
      ELSE territory_id
    END,
    updated_at = NOW()
  WHERE id = user_id
  RETURNING * INTO updated_profile;

  -- Return the updated profile
  RETURN updated_profile;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_user_profile(UUID, JSONB) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION update_user_profile(UUID, JSONB) IS 'Updates user profile data with elevated permissions to bypass RLS during onboarding'; 