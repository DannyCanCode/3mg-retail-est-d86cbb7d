-- First, let's create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS material_waste_percentage (
    id SERIAL PRIMARY KEY,
    material_id TEXT NOT NULL UNIQUE,
    waste_percentage INT4 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clear existing data
DELETE FROM material_waste_percentage;

-- Insert default waste percentages for shingles (12%)
INSERT INTO material_waste_percentage (material_id, waste_percentage) VALUES
-- GAF Shingles
('gaf-timberline-hdz', 12),
('gaf-timberline-hdz-sg', 12),
('gaf-timberline-hdz-rs', 12),
('gaf-timberline-as', 12),
('gaf-timberline-cs', 12),
('gaf-timberline-ns', 12),
-- Generic shingles
('generic-standard-3tab-shingles', 12),
('generic-architectural-shingles', 12);

-- Insert default waste percentages for ridge shingles (14%)
INSERT INTO material_waste_percentage (material_id, waste_percentage) VALUES
('gaf-seal-a-ridge', 14),
('gaf-timbertex', 14),
('gaf-ridglass', 14),
('generic-ridge-cap', 14);

-- Insert default waste percentages for starter shingles (12%)
INSERT INTO material_waste_percentage (material_id, waste_percentage) VALUES
('gaf-prostart-starter-shingle-strip', 12),
('gaf-startermatch', 12),
('generic-starter-shingles', 12);

-- Insert default waste percentages for underlayments (10%)
INSERT INTO material_waste_percentage (material_id, waste_percentage) VALUES
('gaf-feltbuster-synthetic-underlayment', 10),
('gaf-deck-armor-synthetic-underlayment', 10),
('gaf-tiger-paw-synthetic-underlayment', 10),
('gaf-weatherwatch-ice-water-shield', 10),
('gaf-stormguard-ice-water-shield', 10),
('generic-15lb-felt', 10),
('generic-30lb-felt', 10),
('generic-synthetic-underlayment', 10),
('generic-ice-and-water-shield', 10);

-- Insert default waste percentages for low slope materials (12%)
INSERT INTO material_waste_percentage (material_id, waste_percentage) VALUES
('gaf-liberty-sb-cap', 12),
('gaf-liberty-sa-cap', 12),
('gaf-liberty-sb-base', 12),
('gaf-liberty-sa-base', 12),
('abc-pro-guard-20', 12),
('generic-modified-bitumen', 12);

-- Insert default waste percentages for ventilation (0%)
INSERT INTO material_waste_percentage (material_id, waste_percentage) VALUES
('gaf-cobra-ridge-vent', 0),
('gaf-cobra-ridge-runner', 0),
('gaf-master-flow-box-vents', 0),
('generic-ridge-vent', 0),
('generic-box-vents', 0),
('generic-soffit-vents', 0);

-- Insert default waste percentages for accessories (0%)
INSERT INTO material_waste_percentage (material_id, waste_percentage) VALUES
('nails-coil-1-3-4-in', 0),
('nails-hand-drive-1-3-4-in', 0),
('pipe-jack', 0),
('gaf-quickstart-peel-stick-starter', 0); 