// Bulk User Upload Script for 3MG Retail Estimator
// This script creates users and assigns them to territories under their managers

import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

// Supabase configuration
const SUPABASE_URL = 'https://xtdyirvhfyxmpexvjjcb.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key-here';

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Territory name mapping (standardized names)
const TERRITORY_MAPPING = {
  'tampa': 'Southwest Florida',
  'southwest florida': 'Southwest Florida',
  'miami': 'South Florida',
  'south florida': 'South Florida',
  'winter park': 'Central Florida',
  'central florida': 'Central Florida',
  'ocala': 'North Central Florida',
  'north central florida': 'North Central Florida',
  'jacksonville': 'Northeast Florida',
  'northeast florida': 'Northeast Florida',
  'stuart': 'Southeast Florida',
  'southeast florida': 'Southeast Florida',
  'st. louis': 'East Missouri',
  'st louis': 'East Missouri',
  'east missouri': 'East Missouri',
  'kansas city': 'West Missouri',
  'west missouri': 'West Missouri'
};

// Manager email to territory mapping
const MANAGER_TERRITORIES = {
  'josh.vanhorn@3mgroofing.com': 'Southwest Florida',
  'jacob.kallhoff@3mgroofing.com': 'North Central Florida',
  'chase.lovejoy@3mgroofing.com': 'Central Florida',
  'adam@3mgroofing.com': 'Central Florida',
  'dmpearl@3mgroofing.com': 'South Florida',
  'nickolas.nell@3mgroofing.com': 'Southeast Florida',
  'harrison.cremata@3mgroofing.com': 'Northeast Florida'
};

// Generate a secure password
function generatePassword(name) {
  const firstName = name.split(' ')[0] || 'User';
  const randomNum = Math.floor(Math.random() * 9000) + 1000;
  return `${firstName}3MG${randomNum}!`;
}

// Get territory ID by name
async function getTerritoryId(territoryName) {
  const { data, error } = await supabase
    .from('territories')
    .select('id')
    .eq('name', territoryName)
    .single();
  
  if (error || !data) {
    console.error(`❌ Territory not found: ${territoryName}`);
    return null;
  }
  
  return data.id;
}

// Create a single user
async function createUser(userData) {
  const { 
    email, 
    fullName, 
    role = 'rep', 
    territoryName,
    managerEmail,
    password
  } = userData;

  console.log(`\n📝 Creating user: ${email}`);

  try {
    // Normalize territory name
    const normalizedTerritory = TERRITORY_MAPPING[territoryName.toLowerCase()] || territoryName;
    
    // Get territory ID
    const territoryId = await getTerritoryId(normalizedTerritory);
    if (!territoryId) {
      console.error(`❌ Failed to find territory: ${normalizedTerritory}`);
      return { success: false, error: `Territory not found: ${normalizedTerritory}` };
    }

    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password || generatePassword(fullName),
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: role,
        territory_id: territoryId,
        is_admin: false,
        completed_onboarding: true
      }
    });

    if (authError) {
      console.error(`❌ Error creating auth user:`, authError);
      return { success: false, error: authError.message };
    }

    console.log(`✅ Created auth user: ${email}`);

    // Update profile with territory assignment
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        role: role,
        territory_id: territoryId,
        completed_onboarding: true,
        job_title: role === 'manager' ? `${normalizedTerritory} Territory Manager` : 'Sales Representative'
      })
      .eq('id', authUser.user.id);

    if (profileError) {
      console.error(`❌ Error updating profile:`, profileError);
      return { success: false, error: profileError.message };
    }

    console.log(`✅ Successfully created user: ${email} in ${normalizedTerritory}`);
    
    return { 
      success: true, 
      user: {
        email,
        fullName,
        territory: normalizedTerritory,
        password: password || generatePassword(fullName)
      }
    };

  } catch (error) {
    console.error(`❌ Unexpected error creating user ${email}:`, error);
    return { success: false, error: error.message };
  }
}

// Read users from Excel file
function readUsersFromExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  return data.map(row => ({
    email: row['Email'] || row['email'],
    fullName: row['Full Name'] || row['Name'] || row['full_name'],
    role: (row['Role'] || row['role'] || 'rep').toLowerCase(),
    territoryName: row['Territory'] || row['territory'],
    managerEmail: row['Manager Email'] || row['manager_email'] || row['Manager']
  }));
}

// Main bulk upload function
async function bulkUploadUsers(filePath) {
  console.log('🚀 Starting bulk user upload...\n');
  
  // Read users from Excel
  const users = readUsersFromExcel(filePath);
  console.log(`📊 Found ${users.length} users to create\n`);
  
  const results = {
    successful: [],
    failed: []
  };
  
  // Create users one by one
  for (const user of users) {
    const result = await createUser(user);
    
    if (result.success) {
      results.successful.push(result.user);
    } else {
      results.failed.push({ ...user, error: result.error });
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Generate report
  console.log('\n📋 BULK UPLOAD REPORT');
  console.log('====================');
  console.log(`✅ Successful: ${results.successful.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  
  // Save credentials to file
  if (results.successful.length > 0) {
    const credentialsFile = `user-credentials-${new Date().toISOString().split('T')[0]}.csv`;
    const csvContent = 'Email,Full Name,Territory,Password\n' + 
      results.successful.map(u => `${u.email},${u.fullName},${u.territory},${u.password}`).join('\n');
    
    fs.writeFileSync(credentialsFile, csvContent);
    console.log(`\n📄 Credentials saved to: ${credentialsFile}`);
  }
  
  // Show failed users
  if (results.failed.length > 0) {
    console.log('\n❌ Failed Users:');
    results.failed.forEach(u => {
      console.log(`   - ${u.email}: ${u.error}`);
    });
  }
  
  return results;
}

// Example: Create a single user
async function createSingleUser() {
  const result = await createUser({
    email: 'john.doe@3mgroofing.com',
    fullName: 'John Doe',
    role: 'rep',
    territoryName: 'Southeast Florida',
    managerEmail: 'nickolas.nell@3mgroofing.com'
  });
  
  if (result.success) {
    console.log('\n✅ User created successfully!');
    console.log(`   Email: ${result.user.email}`);
    console.log(`   Password: ${result.user.password}`);
    console.log(`   Territory: ${result.user.territory}`);
  }
}

// Example usage
if (process.argv[2] === 'single') {
  // Create a single user
  createSingleUser();
} else if (process.argv[2]) {
  // Bulk upload from Excel file
  bulkUploadUsers(process.argv[2]);
} else {
  console.log('Usage:');
  console.log('  node bulk-user-upload-template.js <excel-file>   # Bulk upload from Excel');
  console.log('  node bulk-user-upload-template.js single         # Create single test user');
  console.log('\nExcel file should have columns: Email, Full Name, Role, Territory, Manager Email');
} 