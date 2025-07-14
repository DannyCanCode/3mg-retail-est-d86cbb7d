-- =============================================================
-- QUICK FIX: Territory Display Issue
-- Taylor showing "Territory a221805b... Territory" instead of "Winter Park Territory"
-- =============================================================

-- Check Taylor's current territory assignment
SELECT 
  'TAYLOR TERRITORY CHECK:' as info,
  p.email,
  p.full_name,
  p.role,
  p.territory_id,
  t.name as territory_name,
  t.id as territory_uuid
FROM profiles p
LEFT JOIN territories t ON p.territory_id = t.id
WHERE p.email = 'taylor.hilton@3mgroofing.com';

-- Check all Winter Park users to see if others have same issue
SELECT 
  'WINTER PARK TEAM:' as info,
  p.email,
  p.full_name,
  p.role,
  t.name as territory_name,
  t.id as territory_uuid
FROM profiles p
LEFT JOIN territories t ON p.territory_id = t.id
WHERE t.name = 'Winter Park'
ORDER BY p.role DESC, p.full_name;

-- Check if Winter Park territory exists properly
SELECT 
  'WINTER PARK TERRITORY:' as info,
  id,
  name,
  is_active,
  created_at
FROM territories
WHERE name = 'Winter Park';

-- If territory assignment is correct, this is a frontend issue
-- The problem is likely in the SalesRepDashboard.tsx component
-- where it's showing territory ID instead of territory name

-- =============================================================
-- NOTES FOR FRONTEND FIX:
-- =============================================================
/*
The issue is in src/pages/SalesRepDashboard.tsx around line 69:

Current code probably looks like:
setTerritory({
  id: profile.territory_id,
  name: `Territory ${profile.territory_id.substring(0, 8)}...`
});

This should be changed to properly fetch the territory name from the database
or use the territory name that's already available in the profile context.

The fix should:
1. Query the territories table to get the actual territory name
2. Use the territory name from the profile context if available
3. Display "Winter Park Territory" instead of the UUID substring
*/ 