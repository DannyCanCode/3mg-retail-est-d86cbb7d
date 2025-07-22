-- Add 3MG Package 1 and 3MG Package 2 to the database
-- This migration adds the 3MG packages and their associated materials

-- Insert 3MG package definitions
INSERT INTO packages (name, description, is_active)
VALUES 
('3MG Standard', 'OC Oakridge with MaxFelt synthetic underlayment and 10-year workmanship warranty', true),
('3MG Select', 'GAF UHDZ with MaxFelt synthetic underlayment and 25-year workmanship warranty', true);

-- Get the IDs of the newly inserted packages
-- Note: This assumes sequential IDs. In production, you might want to use a different approach
DO $$
DECLARE
  v_3mg1_id INTEGER;
  v_3mg2_id INTEGER;
BEGIN
  -- Get the ID for 3MG Standard
  SELECT id INTO v_3mg1_id FROM packages WHERE name = '3MG Standard' LIMIT 1;
  
  -- Get the ID for 3MG Select
  SELECT id INTO v_3mg2_id FROM packages WHERE name = '3MG Select' LIMIT 1;
  
  -- Insert package materials for 3MG Standard
  INSERT INTO package_materials (package_id, material_id, is_required)
  VALUES
  (v_3mg1_id, 'oc-oakridge', true),
  (v_3mg1_id, 'oc-starter', true),
  (v_3mg1_id, 'oc-hip-ridge', true),
  (v_3mg1_id, 'maxfelt-nc', true),
  (v_3mg1_id, 'gaf-weatherwatch-ice-water-shield', true),
  (v_3mg1_id, 'adjustable-lead-pipe-flashing-4inch', true),
  (v_3mg1_id, 'master-sealant', true),
  (v_3mg1_id, 'cdx-plywood', true),
  (v_3mg1_id, 'millennium-galvanized-drip-edge', true),
  (v_3mg1_id, 'karnak-flashing-cement', true),
  (v_3mg1_id, '1inch-plastic-cap-nails', true),
  (v_3mg1_id, 'abc-electro-galvanized-coil-nails', true);

  -- Insert package materials for 3MG Select
  INSERT INTO package_materials (package_id, material_id, is_required)
  VALUES
  (v_3mg2_id, 'gaf-uhdz', true),
  (v_3mg2_id, 'gaf-prostart-starter-shingle-strip', true),
  (v_3mg2_id, 'gaf-seal-a-ridge', true),
  (v_3mg2_id, 'maxfelt-nc', true),
  (v_3mg2_id, 'gaf-weatherwatch-ice-water-shield', true),
  (v_3mg2_id, 'adjustable-lead-pipe-flashing-4inch', true),
  (v_3mg2_id, 'gaf-cobra-rigid-vent', true),
  (v_3mg2_id, 'master-sealant', true),
  (v_3mg2_id, 'cdx-plywood', true),
  (v_3mg2_id, 'millennium-galvanized-drip-edge', true),
  (v_3mg2_id, 'karnak-flashing-cement', true),
  (v_3mg2_id, 'soffit-vents-continuous', true),
  (v_3mg2_id, '1inch-plastic-cap-nails', true),
  (v_3mg2_id, 'abc-electro-galvanized-coil-nails', true),
  (v_3mg2_id, 'coil-nails-ring-shank', true);
END $$; 