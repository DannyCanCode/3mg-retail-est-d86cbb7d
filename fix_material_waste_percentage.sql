-- First, let's delete entries that don't match our actual materials
DELETE FROM material_waste_percentage 
WHERE material_id NOT IN (
  'maxfelt-nc', 'oc-starter', 'rhino-g-ps', 'cdx-plywood', 'oc-duration', 
  'oc-oakridge', 'oc-hip-ridge', 'gaf-seal-a-ridge', 'gaf-timberline-hdz-sg', 
  'gaf-timbertex', 'gaf-ridglass', 'gaf-prostart-starter-shingle-strip', 
  'gaf-weatherwatch-ice-water-shield', 'gaf-feltbuster-synthetic-underlayment', 
  'abc-pro-guard-20', 'gaf-timberline-hdz', 'generic-ridge-cap',
  'generic-standard-3tab-shingles', 'generic-architectural-shingles',
  'master-sealant', 'bullet-boot-4inch', 'adjustable-lead-pipe-flashing-4inch',
  'karnak-asphalt-primer-spray', 'polyglass-elastoflex-sbs', 'polyglass-polyflex-app',
  'gaf-poly-iso-4x8', 'full-peel-stick-system'
);

-- Now, add or update waste percentages for the materials we actually use
INSERT INTO material_waste_percentage (material_id, waste_percentage)
VALUES
-- Ridge materials (14%)
('oc-hip-ridge', 14),
('gaf-seal-a-ridge', 14),
('gaf-timbertex', 14),
('gaf-ridglass', 14),
('generic-ridge-cap', 14),

-- Shingles (12%)
('gaf-timberline-hdz', 12),
('gaf-timberline-hdz-sg', 12),
('oc-oakridge', 12),
('oc-duration', 12),
('oc-starter', 12),
('gaf-prostart-starter-shingle-strip', 12),
('generic-standard-3tab-shingles', 12),
('generic-architectural-shingles', 12),
('polyglass-elastoflex-sbs', 12),
('polyglass-polyflex-app', 12),
('gaf-poly-iso-4x8', 12),

-- Underlayments (10%)
('maxfelt-nc', 10),
('rhino-g-ps', 10),
('gaf-weatherwatch-ice-water-shield', 10),
('gaf-feltbuster-synthetic-underlayment', 10),
('abc-pro-guard-20', 10),
('full-peel-stick-system', 10),

-- No waste (0%)
('cdx-plywood', 0),
('master-sealant', 0),
('bullet-boot-4inch', 0),
('adjustable-lead-pipe-flashing-4inch', 0),
('karnak-asphalt-primer-spray', 0)

ON CONFLICT (material_id) DO UPDATE
SET waste_percentage = EXCLUDED.waste_percentage; 