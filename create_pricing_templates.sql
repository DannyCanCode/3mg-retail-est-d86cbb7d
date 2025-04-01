-- Create pricing_templates table
CREATE TABLE IF NOT EXISTS pricing_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  materials JSONB NOT NULL,
  quantities JSONB NOT NULL,
  labor_rates JSONB NOT NULL,
  profit_margin NUMERIC NOT NULL DEFAULT 25,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_default BOOLEAN DEFAULT FALSE
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_pricing_templates_is_default ON pricing_templates(is_default);

-- Enable row level security (important for security)
ALTER TABLE pricing_templates ENABLE ROW LEVEL SECURITY;

-- Create policies to allow anonymous access (since the app uses the anon key)
-- Policy to allow reading all pricing templates
CREATE POLICY "Allow anonymous select on pricing_templates" ON pricing_templates
  FOR SELECT USING (true);

-- Policy to allow inserting new pricing templates
CREATE POLICY "Allow anonymous insert on pricing_templates" ON pricing_templates
  FOR INSERT WITH CHECK (true);

-- Policy to allow updating existing pricing templates
CREATE POLICY "Allow anonymous update on pricing_templates" ON pricing_templates
  FOR UPDATE USING (true) WITH CHECK (true);

-- Policy to allow deleting pricing templates
CREATE POLICY "Allow anonymous delete on pricing_templates" ON pricing_templates
  FOR DELETE USING (true);

-- Add a trigger to ensure only one default template exists
CREATE OR REPLACE FUNCTION ensure_single_default_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE pricing_templates
    SET is_default = FALSE
    WHERE id != NEW.id AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_single_default_template
BEFORE INSERT OR UPDATE ON pricing_templates
FOR EACH ROW
EXECUTE FUNCTION ensure_single_default_template(); 