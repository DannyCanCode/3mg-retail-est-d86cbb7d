// Script to create a test sales rep user in Supabase
// This user will have restricted access as per the sales rep role

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test sales rep details
const SALES_REP_EMAIL = 'test.salesrep@3mgroofing.com';
const SALES_REP_PASSWORD = 'TestSalesRep2024!';
const SALES_REP_NAME = 'Test Sales Rep';

async function createSalesRepUser() {
  try {
    console.log('🚀 Creating test sales rep user...');
    
    // Step 1: Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.getUserByEmail(SALES_REP_EMAIL);
    
    if (existingUser) {
      console.log('⚠️  User already exists, updating profile...');
      
      // Update the profile to ensure it has sales rep role
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          role: 'rep',
          full_name: SALES_REP_NAME,
          territory_id: null, // Sales reps don't need territory assignment initially
          completed_onboarding: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id);
        
      if (updateError) {
        console.error('❌ Error updating profile:', updateError);
      } else {
        console.log('✅ Profile updated successfully');
        console.log('\n📋 Sales Rep Login Credentials:');
        console.log(`Email: ${SALES_REP_EMAIL}`);
        console.log(`Password: ${SALES_REP_PASSWORD}`);
      }
      
      return;
    }
    
    // Step 2: Create new user
    console.log('Creating new user...');
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: SALES_REP_EMAIL,
      password: SALES_REP_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: SALES_REP_NAME,
        role: 'rep'
      }
    });
    
    if (createError) {
      console.error('❌ Error creating user:', createError);
      return;
    }
    
    console.log('✅ User created successfully');
    
    // Step 3: Ensure profile exists (trigger may have created it)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', newUser.user.id)
      .single();
      
    if (profileError || !profile) {
      console.log('Creating profile manually...');
      
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: newUser.user.id,
          email: SALES_REP_EMAIL,
          full_name: SALES_REP_NAME,
          role: 'rep',
          territory_id: null,
          completed_onboarding: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      if (insertError) {
        console.error('❌ Error creating profile:', insertError);
        return;
      }
    }
    
    console.log('✅ Profile created/verified successfully');
    
    // Step 4: Display success message with login credentials
    console.log('\n🎉 Sales Rep User Setup Complete!');
    console.log('================================');
    console.log('📋 Login Credentials:');
    console.log(`Email: ${SALES_REP_EMAIL}`);
    console.log(`Password: ${SALES_REP_PASSWORD}`);
    console.log('\n🔒 Permissions:');
    console.log('- Can create new estimates');
    console.log('- Can only view their own estimates');
    console.log('- Cannot see profit margins or company data');
    console.log('- Must submit estimates for manager approval');
    console.log('================================\n');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
createSalesRepUser(); 