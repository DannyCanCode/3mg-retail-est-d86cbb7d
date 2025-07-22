-- =============================================================
-- STANDARDIZE SALES REP ROLE - REMOVE project_manager
-- This script migrates all project_manager roles to rep
-- =============================================================

-- Step 1: Show current users with project_manager role
SELECT 
  'USERS WITH PROJECT_MANAGER ROLE:' as info,
  id,
  email,
  role,
  full_name,
  territory_id
FROM profiles
WHERE role = 'project_manager';

-- Step 2: Update all project_manager roles to rep
UPDATE profiles 
SET role = 'rep' 
WHERE role = 'project_manager';

-- Step 3: Verify Taylor is now a rep
SELECT 
  'TAYLOR AFTER UPDATE:' as info,
  p.id,
  p.email,
  p.role,
  p.full_name,
  p.territory_id,
  t.name as territory_name
FROM profiles p
LEFT JOIN territories t ON p.territory_id = t.id
WHERE LOWER(p.email) = 'taylor.hilton@3mgroofing.com';

-- Step 4: Show all roles in use (should no longer include project_manager)
SELECT 
  'ROLES IN USE:' as info,
  role,
  COUNT(*) as user_count
FROM profiles
GROUP BY role
ORDER BY role;

-- Step 5: Update the check constraint to remove project_manager
-- First, drop the existing constraint
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Then, add the new constraint without project_manager
ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'manager', 'rep', 'subtrade_manager'));

-- Step 6: Verify constraint is updated
SELECT 
  'CONSTRAINT DEFINITION:' as info,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'profiles'::regclass
AND contype = 'c'
AND conname LIKE '%role%';

-- =============================================================
-- EXPECTED RESULTS:
-- =============================================================
/*
1. Taylor (and any other project_managers) will have role='rep'
2. No users will have role='project_manager'
3. The check constraint will only allow: admin, manager, rep, subtrade_manager
4. All existing functionality will continue to work
*/ 