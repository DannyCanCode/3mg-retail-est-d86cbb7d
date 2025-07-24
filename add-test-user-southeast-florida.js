// Quick script to add a test user to Southeast Florida for Nick Nell
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xtdyirvhfyxmpexvjjcb.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
  console.log('Get it from: Supabase Dashboard → Settings → API → service_role key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function addTestUserToSoutheastFlorida() {
  console.log('🚀 Adding test user to Southeast Florida...\n');

  try {
    // First, get Southeast Florida territory ID
    const { data: territory, error: territoryError } = await supabase
      .from('territories')
      .select('id, name')
      .eq('name', 'Southeast Florida')
      .single();

    if (territoryError || !territory) {
      console.error('❌ Failed to find Southeast Florida territory:', territoryError);
      return;
    }

    console.log(`✅ Found territory: ${territory.name} (${territory.id})`);

    // Create test user
    const testUser = {
      email: 'test.user.southeast@3mgroofing.com',
      password: 'TestUser3MG2024!',
      fullName: 'Test User Southeast'
    };

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: testUser.email,
      password: testUser.password,
      email_confirm: true,
      user_metadata: {
        full_name: testUser.fullName,
        role: 'rep',
        territory_id: territory.id,
        is_admin: false,
        completed_onboarding: true
      }
    });

    if (authError) {
      console.error('❌ Error creating auth user:', authError);
      return;
    }

    console.log(`✅ Created auth user: ${testUser.email}`);

    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: testUser.fullName,
        role: 'rep',
        territory_id: territory.id,
        completed_onboarding: true,
        job_title: 'Sales Representative'
      })
      .eq('id', authUser.user.id);

    if (profileError) {
      console.error('❌ Error updating profile:', profileError);
      return;
    }

    console.log('\n✅ SUCCESS! Test user created:');
    console.log(`   Email: ${testUser.email}`);
    console.log(`   Password: ${testUser.password}`);
    console.log(`   Territory: Southeast Florida`);
    console.log(`   Manager: Nick Nell`);
    console.log('\n📝 Nick Nell should now see 1 team member in his dashboard!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
addTestUserToSoutheastFlorida(); 