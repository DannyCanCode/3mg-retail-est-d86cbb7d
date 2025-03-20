-- Create packages table
CREATE TABLE IF NOT EXISTS packages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Create package_materials table
CREATE TABLE IF NOT EXISTS package_materials (
  package_id INTEGER REFERENCES packages(id),
  material_id TEXT, -- Reference to material id in our frontend data
  is_required BOOLEAN DEFAULT false,
  PRIMARY KEY (package_id, material_id)
);

-- Create warranties table
CREATE TABLE IF NOT EXISTS warranties (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  package_id INTEGER REFERENCES packages(id),
  is_active BOOLEAN DEFAULT true
);

-- Create warranty requirements table
CREATE TABLE IF NOT EXISTS warranty_requirements (
  warranty_id INTEGER REFERENCES warranties(id),
  material_id TEXT, -- Reference to material id in our frontend data
  PRIMARY KEY (warranty_id, material_id)
);

-- Insert GAF package definitions
INSERT INTO packages (name, description, is_active)
VALUES 
('GAF 1', 'Basic GAF package with standard materials', true),
('GAF 2', 'Premium GAF package including Cobra ventilation and enhanced accessories', true);

-- Insert package materials for GAF 1 (Basic)
INSERT INTO package_materials (package_id, material_id, is_required)
VALUES
(1, 'gaf-timberline-hdz', true),
(1, 'gaf-prostart-starter-shingle-strip', true),
(1, 'gaf-seal-a-ridge', true),
(1, 'gaf-weatherwatch-ice-water-shield', true),
(1, 'gaf-feltbuster-synthetic-underlayment', true);

-- Insert package materials for GAF 2 (Premium)
INSERT INTO package_materials (package_id, material_id, is_required)
VALUES
(2, 'gaf-timberline-hdz', true),
(2, 'gaf-prostart-starter-shingle-strip', true),
(2, 'gaf-seal-a-ridge', true),
(2, 'gaf-weatherwatch-ice-water-shield', true),
(2, 'gaf-feltbuster-synthetic-underlayment', true),
(2, 'gaf-cobra-ridge-vent', true);

-- Insert warranty definitions
INSERT INTO warranties (name, description, package_id, is_active)
VALUES 
('Silver Pledge', 'Standard GAF warranty coverage - requires GAF 1 package', 1, true),
('Gold Pledge', 'Premium GAF warranty with enhanced coverage - requires GAF 2 package', 2, true),
('Full W.W Peel & Stick', 'Enhanced waterproofing with full peel & stick underlayment system', null, true);

-- Insert warranty requirements
INSERT INTO warranty_requirements (warranty_id, material_id)
VALUES
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
(2, 'gaf-cobra-ridge-vent'); 