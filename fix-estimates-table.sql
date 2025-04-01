-- Script to fix the estimates table in Supabase
-- Run this in the Supabase SQL Editor for project zdgicsuqfohnufowksgq

-- Drop the existing table AND dependent objects (like foreign keys)
DROP TABLE IF EXISTS estimates CASCADE;

-- Create estimates table with the correct schema (17 columns)
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
  labor_rates JSONB NOT NULL, -- This was likely the missing column
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

-- Enable row level security (important for security)
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;

-- Create policies to allow anonymous access (since your app uses the anon key)
-- Policy to allow reading all estimates
CREATE POLICY "Allow anonymous select" ON estimates
  FOR SELECT USING (true);

-- Policy to allow inserting new estimates
CREATE POLICY "Allow anonymous insert" ON estimates
  FOR INSERT WITH CHECK (true);

-- Policy to allow updating existing estimates
CREATE POLICY "Allow anonymous update" ON estimates
  FOR UPDATE USING (true) WITH CHECK (true);

-- Policy to allow deleting estimates (optional, add if needed)
-- CREATE POLICY "Allow anonymous delete" ON estimates
--   FOR DELETE USING (true);

-- Verify the table was created with the correct columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'estimates'
ORDER BY ordinal_position; 