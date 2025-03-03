-- Create schema for public tables
CREATE SCHEMA IF NOT EXISTS public;

-- Enable Row Level Security
ALTER SCHEMA public OWNER TO postgres;

-- MEASUREMENTS TABLE
-- Stores measurements extracted from EagleView PDFs
CREATE TABLE public.measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  file_name TEXT,
  total_area NUMERIC,
  predominant_pitch TEXT,
  ridge_length NUMERIC,
  hip_length NUMERIC,
  valley_length NUMERIC,
  rake_length NUMERIC,
  eave_length NUMERIC,
  ridge_count INTEGER,
  hip_count INTEGER,
  valley_count INTEGER,
  rake_count INTEGER,
  eave_count INTEGER,
  step_flashing_length NUMERIC,
  step_flashing_count INTEGER,
  chimney_count INTEGER,
  skylight_count INTEGER,
  turbine_vent_count INTEGER,
  pipe_vent_count INTEGER,
  penetrations_area NUMERIC,
  penetrations_perimeter NUMERIC,
  areas_by_pitch JSONB,
  raw_response JSONB,
  processing_time INTEGER, -- in milliseconds
  success BOOLEAN DEFAULT true,
  error_message TEXT
);

-- PRICING TABLE
-- Stores pricing information for materials
CREATE TABLE public.pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  material_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  coverage_rule JSONB,
  approx_per_square NUMERIC,
  active BOOLEAN DEFAULT true
);

-- ESTIMATES TABLE
-- Stores estimate header information
CREATE TABLE public.estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  measurement_id UUID REFERENCES public.measurements(id),
  total_amount NUMERIC,
  waste_factor NUMERIC DEFAULT 10.0, -- Default 10% waste
  status TEXT DEFAULT 'draft', -- draft, pending, approved, rejected
  notes TEXT,
  created_by TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ
);

-- ESTIMATE_ITEMS TABLE
-- Stores line items for each estimate
CREATE TABLE public.estimate_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  material_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  notes TEXT
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_measurements_updated_at
BEFORE UPDATE ON public.measurements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pricing_updated_at
BEFORE UPDATE ON public.pricing
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_estimates_updated_at
BEFORE UPDATE ON public.estimates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_estimate_items_updated_at
BEFORE UPDATE ON public.estimate_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_items ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (you may want to restrict this in production)
CREATE POLICY "Allow public read access to measurements" 
ON public.measurements FOR SELECT USING (true);

CREATE POLICY "Allow public read access to pricing" 
ON public.pricing FOR SELECT USING (true);

CREATE POLICY "Allow public read access to estimates" 
ON public.estimates FOR SELECT USING (true);

CREATE POLICY "Allow public read access to estimate_items" 
ON public.estimate_items FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to measurements" 
ON public.measurements FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public insert access to estimates" 
ON public.estimates FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public insert access to estimate_items" 
ON public.estimate_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to estimates" 
ON public.estimates FOR UPDATE USING (true);

CREATE POLICY "Allow public update access to estimate_items" 
ON public.estimate_items FOR UPDATE USING (true);

-- Insert initial pricing data based on your material list
INSERT INTO public.pricing (material_id, name, category, price, unit, coverage_rule, approx_per_square)
VALUES
  ('gaf-timberline-hdz', 'GAF Timberline HDZ', 'SHINGLES', 41.86, 'Bundle', 
   '{"description": "3 Bundles/Square (33.3 sq ft per bundle)", "calculation": "Total Area / 33.3 rounded up"}', 125.58),
   
  ('gaf-sa-r-hip-ridge', 'GAF S-A-R Hip & Ridge', 'SHINGLES', 67.22, 'Bundle', 
   '{"description": "25 LF/Bundle", "calculation": "(Ridge Length + Hip Length) ÷ 25, rounded up"}', NULL),
   
  ('gaf-pro-start-starter', 'GAF Pro-Start Starter', 'SHINGLES', 63.33, 'Bundle', 
   '{"description": "120 LF/Bundle", "calculation": "(Eave Length + Rake Length) ÷ 120, rounded up"}', NULL),
   
  ('gaf-royal-sovereign', 'GAF Royal Sovereign', 'SHINGLES', 44.62, 'Bundle', 
   '{"description": "3 Bundles/Square (33.3 sq ft per bundle)", "calculation": "Total Area / 33.3 rounded up"}', 133.86),
   
  ('certainteed-landmark-pro', 'CertainTeed Landmark Pro', 'SHINGLES', 52.93, 'Bundle', 
   '{"description": "3 Bundles/Square (33.3 sq ft per bundle)", "calculation": "Total Area / 33.3 rounded up"}', 158.79),
   
  ('certainteed-landmark', 'CertainTeed Landmark', 'SHINGLES', 49.38, 'Bundle', 
   '{"description": "3 Bundles/Square (33.3 sq ft per bundle)", "calculation": "Total Area / 33.3 rounded up"}', 148.14),
   
  ('certainteed-swiftstart-starter', 'CertainTeed SwiftStart Starter', 'SHINGLES', 41.30, 'Bundle', 
   '{"description": "116 LF/Bundle", "calculation": "(Eave Length + Rake Length) ÷ 116, rounded up"}', NULL),
   
  ('abc-pro-guard-20', 'ABC Pro Guard 20 (Rhino)', 'UNDERLAYMENTS', 83.33, 'Roll', 
   '{"description": "10 Squares/Roll (1,000 sq ft)", "calculation": "Ceiling(Total Squares ÷ 10)"}', 8.33),
   
  ('gaf-feltbuster', 'GAF FeltBuster', 'UNDERLAYMENTS', 102.23, 'Roll', 
   '{"description": "10 Squares/Roll (1,000 sq ft)", "calculation": "Ceiling(Total Squares ÷ 10)"}', 10.22),
   
  ('gaf-weatherwatch', 'GAF Weatherwatch (Peel & Stick)', 'UNDERLAYMENTS', 90.56, 'Roll', 
   '{"description": "2 Squares/Roll (200 sq ft)", "calculation": "Valley Length (ft) ÷ 3 × 0.167 + Eave Length (ft) ÷ 3 × 0.167"}', 45.28),
   
  ('certainteed-flintlastic-sa-plybase', 'CertainTeed Flintlastic SA Plybase', 'LOW_SLOPE', 137.22, 'Roll', 
   '{"description": "2 Squares/Roll (200 sq ft)", "calculation": "Ceiling(Flat Roof Area ÷ 200)"}', 68.61),
   
  ('certainteed-flintlastic-cap', 'CertainTeed Flintlastic CAP', 'LOW_SLOPE', 131.67, 'Roll', 
   '{"description": "1 Square/Roll (100 sq ft)", "calculation": "Ceiling(Flat Roof Area ÷ 100)"}', 131.67),
   
  ('drip-edge-26ga', 'Drip Edge 26GA Galvalume (2.5" Face, Painted)', 'METAL', 13.33, 'Piece', 
   '{"description": "10''/Piece", "calculation": "Ceiling((Eave Length + Rake Length) ÷ 10)"}', NULL),
   
  ('aluminum-eave-drip-edge', 'Aluminum Eave Drip Edge', 'METAL', 16.00, 'Piece', 
   '{"description": "10''/Piece", "calculation": "Ceiling(Eave Length ÷ 10)"}', NULL),
   
  ('valley-metal-26ga', 'Valley Metal 26GA Galvalume 16" × 55''', 'METAL', 91.67, 'Roll', 
   '{"description": "55''/Roll", "calculation": "Ceiling(Valley Length ÷ 55)"}', NULL),
   
  ('gaf-cobra-ridge-vent', 'GAF Cobra Shingle Over Ridge Vent (12")', 'VENTILATION', 22.31, 'Piece', 
   '{"description": "4''/Piece", "calculation": "Ceiling(Ridge Length ÷ 4)"}', NULL),
   
  ('lead-boot-4inch', 'Lead Boot 4"', 'VENTILATION', 27.78, 'Each', 
   '{"description": "1 per pipe penetration", "calculation": "Count of 4\\" pipe penetrations"}', NULL),
   
  ('211-plastic-cement', '211 Plastic Cement (5gal)', 'ACCESSORIES', 48.33, 'Bucket', 
   '{"description": "1 bucket per 10-15 squares", "calculation": "Ceiling(Total Squares ÷ 15)"}', NULL),
   
  ('1inch-plastic-cap-nails', '1" Plastic Cap Nails (3000/pail)', 'ACCESSORIES', 39.48, 'Pail', 
   '{"description": "1 pail per 10 squares of synthetic underlayment", "calculation": "Ceiling(Total Squares ÷ 10)"}', NULL); 