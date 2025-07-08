-- 🚨 EMERGENCY FIX: Chase Lovejoy Territory Assignment
-- Run this in Supabase SQL Editor to fix Chase's territory immediately

-- First, let's see what we're working with
SELECT 
  email, 
  full_name, 
  role, 
  territory_id,
  job_title
FROM profiles 
WHERE email ILIKE '%chase%' OR email ILIKE '%lovejoy%' OR full_name ILIKE '%chase%';

-- Check Adam's territory assignment for reference
SELECT 
  email, 
  full_name, 
  role, 
  territory_id,
  job_title
FROM profiles 
WHERE email ILIKE '%adam%' OR full_name ILIKE '%adam%';

-- Get Winter Park territory ID
SELECT id, name FROM territories WHERE name ILIKE '%winter%';

-- FIX: Update Chase Lovejoy to have the same territory as Adam (Winter Park)
UPDATE profiles 
SET 
  role = 'manager',
  territory_id = (
    SELECT territory_id 
    FROM profiles 
    WHERE (email ILIKE '%adam%' OR full_name ILIKE '%adam%') 
    AND territory_id IS NOT NULL 
    LIMIT 1
  ),
  job_title = 'Winter Park Territory Manager',
  completed_onboarding = true
WHERE (email ILIKE '%chase%' OR email ILIKE '%lovejoy%' OR full_name ILIKE '%chase%')
  AND email IS NOT NULL;

-- Verify the fix worked
SELECT 
  'AFTER UPDATE:' as status,
  email, 
  full_name, 
  role, 
  territory_id,
  job_title
FROM profiles 
WHERE email ILIKE '%chase%' OR email ILIKE '%lovejoy%' OR full_name ILIKE '%chase%';

-- Double-check both Adam and Chase have the same territory
SELECT 
  'COMPARISON:' as status,
  email,
  full_name,
  territory_id,
  (SELECT name FROM territories WHERE id = profiles.territory_id) as territory_name
FROM profiles 
WHERE (email ILIKE '%adam%' OR full_name ILIKE '%adam%' OR email ILIKE '%chase%' OR email ILIKE '%lovejoy%' OR full_name ILIKE '%chase%')
  AND email IS NOT NULL
ORDER BY email; 