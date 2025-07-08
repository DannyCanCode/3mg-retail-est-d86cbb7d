-- Add CDX plywood to GAF 1 and GAF 2 packages
-- This adds the 1/2"x4'x8' CDX Plywood - 4-Ply material to both GAF packages

INSERT INTO package_materials (package_id, material_id, is_required)
VALUES 
  (1, 'cdx-plywood', true),  -- GAF 1 package
  (2, 'cdx-plywood', true)   -- GAF 2 package
ON CONFLICT (package_id, material_id) DO NOTHING; 