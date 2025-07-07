// Script to create territory managers for 3MG Roofing
import { createClient } from '@supabase/supabase-js';

// Environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xtdyirvhfyxmpexvjjcb.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

// Create admin client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// Territory managers to create
const territoryManagers = [
  {
    email: 'Josh.VanHorn@3MGRoofing.com',
    fullName: 'Josh VanHorn',
    territory: 'Tampa',
    password: '3MGTampa2024!'
  },
  {
    email: 'Jacob.Kallhoff@3MGRoofing.com',
    fullName: 'Jacob Kallhoff',
    territory: 'Ocala',
    password: '3MGOcala2024!'
  },
  {
    email: 'Chase.Lovejoy@3MGRoofing.com',
    fullName: 'Chase Lovejoy',
    territory: 'Winter Park',
    password: '3MGWinterPark2024!'
  },
  {
    email: 'adam@3mgroofing.com',
    fullName: 'Adam',
    territory: 'Winter Park',
    password: '3MGWinterPark2024!'
  },
  {
    email: 'dmpearl@3MGRoofing.com',
    fullName: 'DM Pearl',
    territory: 'Miami',
    password: '3MGMiami2024!'
  }
];

async function createTerritoryManagers() {
  console.log('🚀 Starting territory manager creation...\n');

  try {
    // First, get all territories to map names to IDs
    console.log('📍 Fetching territories...');
    const { data: territories, error: territoriesError } = await supabase
      .from('territories')
      .select('id, name');

    if (territoriesError) {
      throw new Error(`Failed to fetch territories: ${territoriesError.message}`);
    }

    console.log(`✅ Found ${territories.length} territories:`, territories.map(t => t.name).join(', '));

    // Create a mapping of territory names to IDs
    const territoryMap = {};
    territories.forEach(territory => {
      territoryMap[territory.name] = territory.id;
    });

    // Create each territory manager
    for (const manager of territoryManagers) {
      console.log(`\n👤 Creating territory manager: ${manager.fullName} (${manager.email})`);

      const territoryId = territoryMap[manager.territory];
      if (!territoryId) {
        console.error(`❌ Territory '${manager.territory}' not found`);
        continue;
      }

      try {
        // Create auth user with admin privileges
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: manager.email,
          password: manager.password,
          email_confirm: true, // Skip email confirmation
          user_metadata: {
            full_name: manager.fullName,
            role: 'manager',
            territory_id: territoryId,
            is_admin: false,
            completed_onboarding: true
          }
        });

        if (authError) {
          if (authError.message.includes('already registered')) {
            console.log(`⚠️  User ${manager.email} already exists, updating profile...`);
            
            // Get existing user
            const { data: existingUser, error: getUserError } = await supabase.auth.admin.getUserByEmail(manager.email);
            if (getUserError || !existingUser.user) {
              console.error(`❌ Could not find existing user: ${getUserError?.message}`);
              continue;
            }

            // Update existing user's profile
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                full_name: manager.fullName,
                role: 'manager',
                territory_id: territoryId,
                job_title: `${manager.territory} Territory Manager`,
                completed_onboarding: true,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingUser.user.id);

            if (updateError) {
              console.error(`❌ Failed to update profile: ${updateError.message}`);
            } else {
              console.log(`✅ Updated existing user profile for ${manager.email}`);
            }
            continue;
          } else {
            throw authError;
          }
        }

        console.log(`✅ Created auth user for ${manager.email}`);

        // The profile should be created automatically by the trigger, but let's verify
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (profileError || !profile) {
          console.log(`⚠️  Profile not found, creating manually...`);
          
          // Create profile manually if trigger didn't work
          const { error: createProfileError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              email: manager.email,
              full_name: manager.fullName,
              role: 'manager',
              territory_id: territoryId,
              job_title: `${manager.territory} Territory Manager`,
              is_admin: false,
              completed_onboarding: true
            });

          if (createProfileError) {
            console.error(`❌ Failed to create profile manually: ${createProfileError.message}`);
            continue;
          }
        } else {
          // Update profile with territory info
          const { error: updateProfileError } = await supabase
            .from('profiles')
            .update({
              territory_id: territoryId,
              job_title: `${manager.territory} Territory Manager`,
              completed_onboarding: true
            })
            .eq('id', authData.user.id);

          if (updateProfileError) {
            console.error(`⚠️  Warning: Could not update profile: ${updateProfileError.message}`);
          }
        }

        console.log(`✅ Territory manager ${manager.fullName} created successfully!`);
        console.log(`   📧 Email: ${manager.email}`);
        console.log(`   🔑 Password: ${manager.password}`);
        console.log(`   🏢 Territory: ${manager.territory} (${territoryId})`);

      } catch (error) {
        console.error(`❌ Failed to create ${manager.email}:`, error.message);
      }
    }

    console.log('\n🎉 Territory manager creation process completed!');
    console.log('\n📝 Summary of credentials:');
    console.log('=' .repeat(50));
    
    territoryManagers.forEach(manager => {
      console.log(`${manager.fullName} (${manager.territory})`);
      console.log(`  Email: ${manager.email}`);
      console.log(`  Password: ${manager.password}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the script
createTerritoryManagers()
  .then(() => {
    console.log('✅ Script completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }); 