-- Add sold-related columns to estimates table
ALTER TABLE estimates 
ADD COLUMN IF NOT EXISTS is_sold BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sold_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS job_type TEXT CHECK (job_type IN ('Retail', 'Insurance')),
ADD COLUMN IF NOT EXISTS insurance_company TEXT,
ADD COLUMN IF NOT EXISTS calculated_material_cost NUMERIC,
ADD COLUMN IF NOT EXISTS calculated_labor_cost NUMERIC,
ADD COLUMN IF NOT EXISTS calculated_subtotal NUMERIC,
ADD COLUMN IF NOT EXISTS calculated_profit_amount NUMERIC,
ADD COLUMN IF NOT EXISTS peel_stick_addon_cost NUMERIC DEFAULT 0;

-- Add indexes for sold estimates queries
CREATE INDEX IF NOT EXISTS idx_estimates_is_sold ON estimates(is_sold);
CREATE INDEX IF NOT EXISTS idx_estimates_sold_at ON estimates(sold_at);
CREATE INDEX IF NOT EXISTS idx_estimates_job_type ON estimates(job_type); 