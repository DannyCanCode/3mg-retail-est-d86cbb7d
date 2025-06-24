-- Add estimate type and subtrades tracking to estimates table
ALTER TABLE estimates 
ADD COLUMN IF NOT EXISTS estimate_type TEXT DEFAULT 'roof_only' CHECK (estimate_type IN ('roof_only', 'with_subtrades')),
ADD COLUMN IF NOT EXISTS selected_subtrades JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS subtrade_status JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS subtrade_pricing JSONB DEFAULT '{}'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN estimates.estimate_type IS 'Type of estimate: roof_only or with_subtrades';
COMMENT ON COLUMN estimates.selected_subtrades IS 'Array of selected subtrade types (hvac, electrical, plumbing, etc.)';
COMMENT ON COLUMN estimates.subtrade_status IS 'Status tracking for each subtrade (pending, in_progress, completed, etc.)';
COMMENT ON COLUMN estimates.subtrade_pricing IS 'Pricing breakdown for each subtrade';

-- Create index for faster queries on estimate type
CREATE INDEX IF NOT EXISTS idx_estimates_type ON estimates(estimate_type);
CREATE INDEX IF NOT EXISTS idx_estimates_subtrades ON estimates USING GIN(selected_subtrades);

-- Update existing estimates to have default values
UPDATE estimates 
SET estimate_type = 'roof_only', 
    selected_subtrades = '[]'::jsonb,
    subtrade_status = '{}'::jsonb,
    subtrade_pricing = '{}'::jsonb
WHERE estimate_type IS NULL; 