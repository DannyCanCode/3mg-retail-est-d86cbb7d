-- Create estimates table
CREATE TABLE IF NOT EXISTS estimates (
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
CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status); 