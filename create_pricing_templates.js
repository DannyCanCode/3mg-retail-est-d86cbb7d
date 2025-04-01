// Script to create the pricing_templates table in the remote Supabase database
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Get Supabase URL and anon key from environment or use the hardcoded values from .env for simplicity
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://zdgicsuqfohnufowksgq.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZ2ljc3VxZm9obnVmb3drc2dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3NTk2MzcsImV4cCI6MjA1NjMzNTYzN30.Zg7a-BeP6O1lkNQ2oE9EUEY32cUcbiCkD2RZ_mdsxdg";

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkPricingTemplatesTable() {
  console.log('Checking if pricing_templates table exists...');
  
  try {
    // Try to select from the pricing_templates table to see if it exists
    const { data, error } = await supabase
      .from('pricing_templates')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Error checking pricing_templates table:', error);
      console.log('Table likely does not exist or has permission issues.');
      return false;
    }
    
    console.log('pricing_templates table exists!');
    console.log('Sample data:', data);
    return true;
  } catch (err) {
    console.error('Caught an exception checking table:', err);
    return false;
  }
}

async function createPricingTemplatesTable() {
  try {
    // Read the SQL file
    const sqlPath = path.resolve('./create_pricing_templates.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Executing SQL to create pricing_templates table...');
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      console.error('Error creating pricing_templates table:', error);
      return false;
    }
    
    console.log('pricing_templates table created successfully!');
    return true;
  } catch (err) {
    console.error('Caught an exception creating table:', err);
    return false;
  }
}

async function testInsertRecord() {
  try {
    // Create a test pricing template
    const testTemplate = {
      name: 'Test Template',
      description: 'This is a test template',
      materials: JSON.stringify({}),
      quantities: JSON.stringify({}),
      labor_rates: JSON.stringify({
        laborRate: 85,
        isHandload: false,
        handloadRate: 15,
        dumpsterLocation: "orlando",
        dumpsterCount: 1,
        dumpsterRate: 400,
        includePermits: true,
        permitRate: 550,
        pitchRates: {},
        wastePercentage: 12
      }),
      profit_margin: 25,
      is_default: true
    };
    
    console.log('Inserting test record into pricing_templates table...');
    
    // Insert test record
    const { data, error } = await supabase
      .from('pricing_templates')
      .insert(testTemplate)
      .select();
    
    if (error) {
      console.error('Error inserting test record:', error);
      return false;
    }
    
    console.log('Test record inserted successfully!');
    console.log('Record:', data);
    
    // Clean up test record
    const { error: deleteError } = await supabase
      .from('pricing_templates')
      .delete()
      .eq('name', 'Test Template');
    
    if (deleteError) {
      console.warn('Warning: Could not delete test record:', deleteError);
    } else {
      console.log('Test record deleted successfully.');
    }
    
    return true;
  } catch (err) {
    console.error('Caught an exception inserting test record:', err);
    return false;
  }
}

// Run the check and setup process
(async () => {
  const tableExists = await checkPricingTemplatesTable();
  
  if (tableExists) {
    console.log('Table exists, testing insert permission...');
    const canInsert = await testInsertRecord();
    
    if (canInsert) {
      console.log('SUCCESS: Table exists and has proper insert permissions!');
    } else {
      console.log('ISSUE DETECTED: Table exists but has issues with insert permissions or schema.');
      
      const recreate = await askQuestion('Would you like to drop and recreate the table? (y/n) ');
      
      if (recreate.toLowerCase() === 'y') {
        // Execute the SQL to recreate the table
        await createPricingTemplatesTable();
      }
    }
  } else {
    console.log('Table does not exist, creating it now...');
    await createPricingTemplatesTable();
    
    // Test if we can insert after creating the table
    const canInsert = await testInsertRecord();
    
    if (canInsert) {
      console.log('SUCCESS: Table created and has proper insert permissions!');
    } else {
      console.log('ISSUE DETECTED: Table was created but has issues with insert permissions or schema.');
    }
  }
  
  // Exit the script
  process.exit(0);
})();

// Helper function to prompt for user input
function askQuestion(query) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => readline.question(query, ans => {
    readline.close();
    resolve(ans);
  }));
} 