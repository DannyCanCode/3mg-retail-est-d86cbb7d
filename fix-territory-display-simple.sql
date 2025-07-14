-- =============================================================
-- SIMPLE TERRITORY DISPLAY FIX
-- Fix "Territory a221805b... Territory" issue for Taylor
-- =============================================================

-- First, check what columns actually exist in territories table
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'territories' AND table_schema = 'public'
ORDER BY ordinal_position;

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

-- Check all available territories (using only basic columns)
SELECT 
  'ALL TERRITORIES:' as info,
  id,
  name
FROM territories
ORDER BY name;

-- Check all Winter Park users
SELECT 
  'WINTER PARK TEAM:' as info,
  p.email,
  p.full_name,
  p.role,
  t.name as territory_name
FROM profiles p
LEFT JOIN territories t ON p.territory_id = t.id
WHERE t.name = 'Winter Park'
ORDER BY p.role DESC, p.full_name;

-- Verify Taylor is properly set up
SELECT 
  'TAYLOR VERIFICATION:' as info,
  p.email,
  p.full_name,
  p.role,
  p.territory_id,
  t.name as territory_name,
  CASE 
    WHEN p.role = 'rep' AND t.name = 'Winter Park' THEN 'CORRECTLY CONFIGURED'
    WHEN p.role IS NULL THEN 'ROLE IS NULL - BROKEN'
    WHEN t.name IS NULL THEN 'TERRITORY NOT ASSIGNED'
    WHEN t.name != 'Winter Park' THEN 'WRONG TERRITORY'
    ELSE 'UNKNOWN ISSUE'
  END as status
FROM profiles p
LEFT JOIN territories t ON p.territory_id = t.id
WHERE p.email = 'taylor.hilton@3mgroofing.com';

-- =============================================================
-- FRONTEND FIX NEEDED
-- =============================================================
/*
If the database data shows Taylor correctly assigned to Winter Park territory,
then the issue is in the frontend code.

The problem is in src/pages/SalesRepDashboard.tsx around line 69-75:

CURRENT BROKEN CODE:
const fetchTerritory = async () => {
  if (!profile?.territory_id) return;
  
  setTerritory({
    id: profile.territory_id,
    name: `Territory ${profile.territory_id.substring(0, 8)}...`  // THIS IS THE PROBLEM
  });
};

SHOULD BE FIXED TO:
const fetchTerritory = async () => {
  if (!profile?.territory_id) return;
  
  try {
    const { data, error } = await supabase
      .from('territories')
      .select('id, name')
      .eq('id', profile.territory_id)
      .single();
    
    if (data && !error) {
      setTerritory({
        id: data.id,
        name: data.name  // Use actual territory name from database
      });
    }
  } catch (error) {
    console.error('Error fetching territory:', error);
  }
};

This will show "Winter Park" instead of "Territory a221805b..."
*/ 