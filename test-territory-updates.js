// Test script to verify territory name updates work correctly
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xtdyirvhfyxmpexvjjcb.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0ZHlpcnZoZnl4bXBleHZqamNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NzQ5MzQsImV4cCI6MjA1MDA1MDkzNH0.U7ZEafrNEJAeKGlQZUZoZOQgOeaJM7rD3q6JYhI54IU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const expectedTerritories = [
  'Tampa',
  'South Florida',
  'Central Florida', 
  'North Central Florida',
  'Northeast Florida',
  'Southeast Florida',
  'East Missouri',
  'West Missouri'
];

async function testTerritoryFetching() {
  console.log('🧪 Testing territory fetching...\n');
  
  try {
    // Test 1: Fetch all territories
    console.log('1️⃣ Fetching all territories...');
    const { data: territories, error } = await supabase
      .from('territories')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('❌ Error fetching territories:', error);
      return false;
    }
    
    console.log('✅ Successfully fetched territories:');
    territories.forEach(territory => {
      console.log(`   • ${territory.name} (${territory.region})`);
    });
    
    // Test 2: Verify expected territories exist
    console.log('\n2️⃣ Verifying expected territories exist...');
    const territoryNames = territories.map(t => t.name);
    
    let allGood = true;
    expectedTerritories.forEach(expected => {
      if (territoryNames.includes(expected)) {
        console.log(`   ✅ ${expected} - Found`);
      } else {
        console.log(`   ❌ ${expected} - Missing`);
        allGood = false;
      }
    });
    
    // Test 3: Check for old territory names that should no longer exist
    console.log('\n3️⃣ Checking for old territory names...');
    const oldTerritories = ['Miami', 'Winter Park', 'Ocala', 'Jacksonville', 'Stuart', 'St. Louis', 'Kansas City'];
    
    oldTerritories.forEach(oldName => {
      if (territoryNames.includes(oldName)) {
        console.log(`   ❌ ${oldName} - Still exists (should be renamed)`);
        allGood = false;
      } else {
        console.log(`   ✅ ${oldName} - Correctly renamed`);
      }
    });
    
    // Test 4: Verify territory manager assignments are intact
    console.log('\n4️⃣ Checking territory manager assignments...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select(`
        email,
        full_name,
        role,
        territory_id,
        territories!inner(name, region)
      `)
      .eq('role', 'manager');
    
    if (profilesError) {
      console.error('❌ Error fetching manager profiles:', profilesError);
      return false;
    }
    
    if (profiles && profiles.length > 0) {
      console.log('   Territory Manager Assignments:');
      profiles.forEach(profile => {
        console.log(`   • ${profile.full_name || profile.email} → ${profile.territories.name}`);
      });
    } else {
      console.log('   ⚠️ No territory managers found');
    }
    
    console.log(`\n🎯 Territory Update Test Results:`);
    console.log(`   • Total territories: ${territories.length}`);
    console.log(`   • Expected territories: ${expectedTerritories.length}`);
    console.log(`   • Territory managers: ${profiles?.length || 0}`);
    console.log(`   • Test status: ${allGood ? '✅ PASSED' : '❌ FAILED'}`);
    
    return allGood;
    
  } catch (err) {
    console.error('❌ Unexpected error during territory test:', err);
    return false;
  }
}

// Run the test
testTerritoryFetching()
  .then(success => {
    console.log(`\n🏁 Test completed: ${success ? 'SUCCESS' : 'FAILURE'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  }); 