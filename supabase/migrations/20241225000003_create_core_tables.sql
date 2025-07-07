-- Create core tables for 3MG Roofing Estimator
-- This migration creates all essential tables in the correct order

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create territories table
CREATE TABLE IF NOT EXISTS territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  region TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'rep' CHECK (role IN ('admin', 'manager', 'rep', 'subtrade_manager')),
  territory_id UUID REFERENCES territories(id),
  org_id UUID REFERENCES organizations(id),
  phone_number TEXT,
  job_title TEXT,
  is_admin BOOLEAN DEFAULT false,
  completed_onboarding BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create measurements table
CREATE TABLE IF NOT EXISTS measurements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  filename TEXT NOT NULL,
  total_area NUMERIC NOT NULL,
  predominant_pitch TEXT NOT NULL,
  property_address TEXT,
  ridges NUMERIC,
  hips NUMERIC,
  valleys NUMERIC,
  rakes NUMERIC,
  eaves NUMERIC,
  step_flashing NUMERIC,
  flashing NUMERIC,
  penetrations NUMERIC,
  penetrations_perimeter NUMERIC,
  areas_per_pitch JSONB,
  length_measurements JSONB,
  total_squares NUMERIC,
  waste_percentage NUMERIC,
  suggested_waste_percentage NUMERIC,
  raw_text TEXT,
  debug_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create pricing_templates table
CREATE TABLE IF NOT EXISTS pricing_templates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT,
  materials JSONB NOT NULL DEFAULT '[]'::jsonb,
  labor_rates JSONB NOT NULL DEFAULT '{}'::jsonb,
  quantities JSONB NOT NULL DEFAULT '{}'::jsonb,
  profit_margin NUMERIC DEFAULT 0.2,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create estimates table
CREATE TABLE IF NOT EXISTS estimates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_name TEXT,
  customer_address TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  status TEXT DEFAULT 'pending',
  total_price NUMERIC NOT NULL DEFAULT 0,
  profit_margin NUMERIC NOT NULL DEFAULT 0.2,
  materials JSONB NOT NULL DEFAULT '[]'::jsonb,
  labor_rates JSONB NOT NULL DEFAULT '{}'::jsonb,
  quantities JSONB NOT NULL DEFAULT '{}'::jsonb,
  measurements JSONB NOT NULL DEFAULT '{}'::jsonb,
  measurement_id TEXT REFERENCES measurements(id),
  notes TEXT,
  pdf_generated BOOLEAN DEFAULT false,
  territory_id UUID REFERENCES territories(id),
  created_by UUID REFERENCES profiles(id),
  creator_name TEXT,
  creator_role TEXT,
  -- Sold-related columns
  is_sold BOOLEAN DEFAULT FALSE,
  sold_at TIMESTAMPTZ,
  job_type TEXT CHECK (job_type IN ('Retail', 'Insurance')),
  insurance_company TEXT,
  calculated_material_cost NUMERIC,
  calculated_labor_cost NUMERIC,
  calculated_subtotal NUMERIC,
  calculated_profit_amount NUMERIC,
  peel_stick_addon_cost NUMERIC DEFAULT 0,
  -- Estimate type columns
  estimate_type TEXT DEFAULT 'roof_only' CHECK (estimate_type IN ('roof_only', 'with_subtrades')),
  selected_subtrades JSONB DEFAULT '[]'::jsonb,
  subtrade_status JSONB DEFAULT '{}'::jsonb,
  subtrade_pricing JSONB DEFAULT '{}'::jsonb,
  -- Soft delete columns
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  deletion_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create estimate_items table
CREATE TABLE IF NOT EXISTS estimate_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  estimate_id TEXT REFERENCES estimates(id) ON DELETE CASCADE,
  pricing_id TEXT,
  description TEXT,
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default territories
INSERT INTO territories (name, region, is_active) VALUES
('Tampa', 'Central Florida', true),
('Ocala', 'North Central Florida', true),
('Winter Park', 'Central Florida', true),
('Miami', 'South Florida', true)
ON CONFLICT (name) DO NOTHING;

-- Insert default organization
INSERT INTO organizations (name) VALUES ('3MG Roofing') ON CONFLICT DO NOTHING;

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_items ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_territory_id ON profiles(territory_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_estimates_territory_id ON estimates(territory_id);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status);
CREATE INDEX IF NOT EXISTS idx_estimates_created_by ON estimates(created_by);
CREATE INDEX IF NOT EXISTS idx_estimates_is_sold ON estimates(is_sold);
CREATE INDEX IF NOT EXISTS idx_estimates_sold_at ON estimates(sold_at);
CREATE INDEX IF NOT EXISTS idx_estimates_deleted_at ON estimates(deleted_at);
CREATE INDEX IF NOT EXISTS idx_pricing_templates_is_default ON pricing_templates(is_default);

-- Basic RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Basic RLS policies for estimates
CREATE POLICY "Users can view estimates" ON estimates
  FOR SELECT USING (true);

CREATE POLICY "Users can insert estimates" ON estimates
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update estimates" ON estimates
  FOR UPDATE USING (true);

-- Basic RLS policies for other tables
CREATE POLICY "Anyone can view territories" ON territories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view pricing templates" ON pricing_templates
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view measurements" ON measurements
  FOR SELECT USING (true);

-- Create function to handle user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_admin, completed_onboarding, territory_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'rep'),
    COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'completed_onboarding')::boolean, false),
    CASE 
      WHEN NEW.raw_user_meta_data ? 'territory_id' THEN (NEW.raw_user_meta_data->>'territory_id')::uuid
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant permissions
GRANT SELECT ON territories TO authenticated;
GRANT SELECT, UPDATE ON profiles TO authenticated;
GRANT ALL ON estimates TO authenticated;
GRANT ALL ON measurements TO authenticated;
GRANT ALL ON pricing_templates TO authenticated;
GRANT ALL ON estimate_items TO authenticated; 