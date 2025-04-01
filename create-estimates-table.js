// Script to create the estimates table in the remote Supabase database
import { createClient } from '@supabase/supabase-js';

// Supabase connection details - hardcoded from .env for simplicity
const SUPABASE_URL = "https://zdgicsuqfohnufowksgq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZ2ljc3VxZm9obnVmb3drc2dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3NTk2MzcsImV4cCI6MjA1NjMzNTYzN30.Zg7a-BeP6O1lkNQ2oE9EUEY32cUcbiCkD2RZ_mdsxdg";

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkEstimatesTable() {
  console.log('Checking if estimates table exists...');
  
  try {
    // Try to select from the estimates table to see if it exists
    const { data, error } = await supabase
      .from('estimates')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Error checking estimates table:', error);
      console.log('Table likely does not exist or has permission issues.');
      return false;
    }
    
    console.log('Estimates table exists!');
    console.log('Sample data:', data);
    return true;
  } catch (err) {
    console.error('Caught an exception checking table:', err);
    return false;
  }
}

async function testInsertRecord() {
  console.log('Testing insert permission with a test record...');
  
  // Create a minimal test record
  const testRecord = {
    customer_address: 'Test Address Only',
    total_price: 1000,
    materials: JSON.stringify({ test: 'material' }),
    quantities: JSON.stringify({ test: 1 }),
    labor_rates: JSON.stringify({ laborRate: 85 }),
    profit_margin: 20,
    measurements: JSON.stringify({ totalArea: 1000 }),
    status: 'test'
  };
  
  try {
    // Attempt to insert the test record
    const { data, error } = await supabase
      .from('estimates')
      .insert(testRecord)
      .select()
      .single();
    
    if (error) {
      console.error('Error inserting test record:', error);
      console.log('Permission or schema issue detected.');
      
      // Check if it's a specific error type
      if (error.code === '42P01') {
        console.log('Error indicates table does not exist.');
      } else if (error.code === '42703') {
        console.log('Error indicates column does not exist.');
      } else if (error.code === '23505') {
        console.log('Error indicates unique constraint violation.');
      } else if (error.code === '23503') {
        console.log('Error indicates foreign key constraint violation.');
      }
      
      return false;
    }
    
    console.log('Test record inserted successfully!');
    console.log('Inserted data:', data);
    
    // Clean up the test record
    if (data?.id) {
      console.log('Cleaning up test record...');
      const { error: deleteError } = await supabase
        .from('estimates')
        .delete()
        .eq('id', data.id);
      
      if (deleteError) {
        console.error('Error deleting test record:', deleteError);
      } else {
        console.log('Test record cleaned up successfully.');
      }
    }
    
    return true;
  } catch (err) {
    console.error('Caught an exception while testing insert:', err);
    return false;
  }
}

// Run the check and test process
(async () => {
  const tableExists = await checkEstimatesTable();
  
  if (tableExists) {
    console.log('Table exists, testing insert permission...');
    const canInsert = await testInsertRecord();
    
    if (canInsert) {
      console.log('SUCCESS: Table exists and has proper insert permissions!');
    } else {
      console.log(`
      ISSUE DETECTED: Table exists but has issues with insert permissions or schema.
      
      Please run the following SQL in your Supabase SQL Editor to recreate the table:
      
      -- Drop the existing table if needed
      DROP TABLE IF EXISTS estimates;
      
      -- Create estimates table
      CREATE TABLE estimates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_name TEXT,
        customer_address TEXT NOT NULL,
        customer_email TEXT,
        customer_phone TEXT,
        measurement_id TEXT,
        total_price NUMERIC NOT NULL,
        materials JSONB NOT NULL,
        quantities JSONB NOT NULL,
        labor_rates JSONB NOT NULL,
        profit_margin NUMERIC NOT NULL,
        measurements JSONB NOT NULL,
        status TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        notes TEXT,
        pdf_generated BOOLEAN DEFAULT FALSE
      );
      
      -- Add index for status filtering
      CREATE INDEX idx_estimates_status ON estimates(status);
      
      -- Allow anonymous select access
      ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Allow anonymous select" ON estimates 
        FOR SELECT USING (true);
      
      -- Allow anonymous insert access
      CREATE POLICY "Allow anonymous insert" ON estimates 
        FOR INSERT WITH CHECK (true);
      
      -- Allow anonymous update access
      CREATE POLICY "Allow anonymous update" ON estimates 
        FOR UPDATE USING (true) WITH CHECK (true);
      `);
    }
  } else {
    console.log(`
    ISSUE DETECTED: Table does not exist or has permission issues.
    
    Please run the following SQL in your Supabase SQL Editor:
    
    -- Create estimates table
    CREATE TABLE estimates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_name TEXT,
      customer_address TEXT NOT NULL,
      customer_email TEXT,
      customer_phone TEXT,
      measurement_id TEXT,
      total_price NUMERIC NOT NULL,
      materials JSONB NOT NULL,
      quantities JSONB NOT NULL,
      labor_rates JSONB NOT NULL,
      profit_margin NUMERIC NOT NULL,
      measurements JSONB NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      notes TEXT,
      pdf_generated BOOLEAN DEFAULT FALSE
    );
    
    -- Add index for status filtering
    CREATE INDEX idx_estimates_status ON estimates(status);
    
    -- Allow anonymous select access
    ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow anonymous select" ON estimates 
      FOR SELECT USING (true);
    
    -- Allow anonymous insert access
    CREATE POLICY "Allow anonymous insert" ON estimates 
      FOR INSERT WITH CHECK (true);
    
    -- Allow anonymous update access
    CREATE POLICY "Allow anonymous update" ON estimates 
      FOR UPDATE USING (true) WITH CHECK (true);
    `);
  }
})(); 