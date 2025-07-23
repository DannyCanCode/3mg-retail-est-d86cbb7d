-- Fix missing material_waste_percentages table
CREATE TABLE IF NOT EXISTS material_waste_percentage (
    id SERIAL PRIMARY KEY,
    material_id TEXT NOT NULL UNIQUE,
    waste_percentage INT4 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default waste percentages
INSERT INTO material_waste_percentage (material_id, waste_percentage) VALUES
('gaf-seal-a-ridge', 14),
('gaf-timbertex', 14),
('gaf-ridglass', 14),
('generic-ridge-cap', 14),
('gaf-timberline-hdz', 12),
('gaf-timberline-hdz-sg', 12),
('gaf-timberline-hdz-rs', 12),
('gaf-timberline-as', 12),
('gaf-timberline-cs', 12),
('gaf-timberline-ns', 12),
('generic-standard-3tab-shingles', 12),
('generic-architectural-shingles', 12),
('gaf-prostart-starter-shingle-strip', 12),
('gaf-startermatch', 12),
('generic-starter-shingles', 12),
('gaf-feltbuster-synthetic-underlayment', 10),
('gaf-deck-armor-synthetic-underlayment', 10),
('gaf-tiger-paw-synthetic-underlayment', 10),
('gaf-weatherwatch-ice-water-shield', 10),
('gaf-stormguard-ice-water-shield', 10),
('generic-15lb-felt', 10),
('generic-30lb-felt', 10),
('generic-synthetic-underlayment', 10),
('generic-ice-and-water-shield', 10),
('gaf-liberty-sb-cap', 12),
('gaf-liberty-sa-cap', 12),
('gaf-liberty-sb-base', 12),
('gaf-liberty-sa-base', 12),
('abc-pro-guard-20', 12),
('generic-modified-bitumen', 12),
('gaf-cobra-ridge-vent', 0),
('gaf-cobra-ridge-runner', 0),
('gaf-master-flow-box-vents', 0),
('generic-ridge-vent', 0),
('generic-box-vents', 0),
('generic-soffit-vents', 0),
('nails-coil-1-3-4-in', 0),
('nails-hand-drive-1-3-4-in', 0),
('pipe-jack', 0),
('gaf-quickstart-peel-stick-starter', 0)
ON CONFLICT (material_id) DO NOTHING;

-- Fix 3MG packages - first ensure packages table exists
CREATE TABLE IF NOT EXISTS packages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Create package_materials table if it doesn't exist
CREATE TABLE IF NOT EXISTS package_materials (
  package_id INTEGER REFERENCES packages(id),
  material_id TEXT,
  is_required BOOLEAN DEFAULT false,
  PRIMARY KEY (package_id, material_id)
);

-- Insert 3MG packages (updating GAF to 3MG)
INSERT INTO packages (id, name, description, is_active) VALUES
(1, '3MG 1', 'Basic 3MG package with standard materials', true),
(2, '3MG 2', 'Premium 3MG package including enhanced ventilation and accessories', true)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- Insert package materials for 3MG 1 (Basic)
INSERT INTO package_materials (package_id, material_id, is_required) VALUES
(1, 'gaf-timberline-hdz', true),
(1, 'gaf-prostart-starter-shingle-strip', true),
(1, 'gaf-seal-a-ridge', true),
(1, 'gaf-weatherwatch-ice-water-shield', true),
(1, 'gaf-feltbuster-synthetic-underlayment', true)
ON CONFLICT (package_id, material_id) DO NOTHING;

-- Insert package materials for 3MG 2 (Premium)
INSERT INTO package_materials (package_id, material_id, is_required) VALUES
(2, 'gaf-timberline-hdz', true),
(2, 'gaf-prostart-starter-shingle-strip', true),
(2, 'gaf-seal-a-ridge', true),
(2, 'gaf-weatherwatch-ice-water-shield', true),
(2, 'gaf-feltbuster-synthetic-underlayment', true),
(2, 'gaf-cobra-ridge-vent', true)
ON CONFLICT (package_id, material_id) DO NOTHING;

-- Create warranties table if it doesn't exist
CREATE TABLE IF NOT EXISTS warranties (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  package_id INTEGER REFERENCES packages(id),
  is_active BOOLEAN DEFAULT true
);

-- Update warranty names
INSERT INTO warranties (id, name, description, package_id, is_active) VALUES
(1, 'Silver Pledge', 'Standard warranty coverage - requires 3MG 1 package', 1, true),
(2, 'Gold Pledge', 'Premium warranty with enhanced coverage - requires 3MG 2 package', 2, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  package_id = EXCLUDED.package_id,
  is_active = EXCLUDED.is_active;

-- Create warranty requirements table if it doesn't exist
CREATE TABLE IF NOT EXISTS warranty_requirements (
  warranty_id INTEGER REFERENCES warranties(id),
  material_id TEXT,
  PRIMARY KEY (warranty_id, material_id)
);

-- Insert warranty requirements
INSERT INTO warranty_requirements (warranty_id, material_id) VALUES
-- Silver Pledge requirements
(1, 'gaf-timberline-hdz'),
(1, 'gaf-prostart-starter-shingle-strip'),
(1, 'gaf-seal-a-ridge'),
(1, 'gaf-weatherwatch-ice-water-shield'),
-- Gold Pledge requirements
(2, 'gaf-timberline-hdz'),
(2, 'gaf-prostart-starter-shingle-strip'),
(2, 'gaf-seal-a-ridge'),
(2, 'gaf-weatherwatch-ice-water-shield'),
(2, 'gaf-feltbuster-synthetic-underlayment'),
(2, 'gaf-cobra-ridge-vent')
ON CONFLICT (warranty_id, material_id) DO NOTHING;

-- Enable RLS on all tables
ALTER TABLE material_waste_percentage ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;  
ALTER TABLE package_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_requirements ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for read access
CREATE POLICY "Anyone can view material waste percentages" ON material_waste_percentage FOR SELECT USING (true);
CREATE POLICY "Anyone can view packages" ON packages FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view package materials" ON package_materials FOR SELECT USING (true);
CREATE POLICY "Anyone can view warranties" ON warranties FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view warranty requirements" ON warranty_requirements FOR SELECT USING (true);

-- Grant permissions
GRANT SELECT ON material_waste_percentage TO authenticated;
GRANT SELECT ON packages TO authenticated;
GRANT SELECT ON package_materials TO authenticated;
GRANT SELECT ON warranties TO authenticated;
GRANT SELECT ON warranty_requirements TO authenticated; 