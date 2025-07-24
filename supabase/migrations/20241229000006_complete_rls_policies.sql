-- Complete RLS policies for all tables

-- Enable RLS on all tables
ALTER TABLE estimate_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_waste_percentage ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_requirements ENABLE ROW LEVEL SECURITY;

-- Estimate Drafts Policies
CREATE POLICY "Users can view their own drafts" ON estimate_drafts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own drafts" ON estimate_drafts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own drafts" ON estimate_drafts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own drafts" ON estimate_drafts
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Estimates Policies (comprehensive)
CREATE POLICY "Users can view estimates they created or own" ON estimates
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid() OR 
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    ) OR
    EXISTS (
      SELECT 1 FROM profiles p1
      JOIN profiles p2 ON p1.territory_id = p2.territory_id
      WHERE p1.id = auth.uid()
      AND p2.id = estimates.created_by
      AND p1.role = 'manager'
    )
  );

CREATE POLICY "Users can create estimates in their territory" ON estimates
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.territory_id = estimates.territory_id OR
        profiles.role = 'admin'
      )
    )
  );

CREATE POLICY "Users can update their own estimates or managed estimates" ON estimates
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid() OR
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM profiles p1
      JOIN profiles p2 ON p1.territory_id = p2.territory_id
      WHERE p1.id = auth.uid()
      AND p2.id = estimates.created_by
      AND p1.role = 'manager'
    )
  );

-- Material Waste Percentage Policies
CREATE POLICY "All authenticated users can view material waste percentages" ON material_waste_percentage
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage material waste percentages" ON material_waste_percentage
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Measurements Policies
CREATE POLICY "Users can view measurements in their territory" ON measurements
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.territory_id = measurements.territory_id
    )
  );

CREATE POLICY "Users can create measurements" ON measurements
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own measurements" ON measurements
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Package Materials Policies
CREATE POLICY "All authenticated users can view package materials" ON package_materials
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage package materials" ON package_materials
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Packages Policies
CREATE POLICY "All authenticated users can view active packages" ON packages
  FOR SELECT TO authenticated
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ));

CREATE POLICY "Only admins can manage packages" ON packages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Pricing Lists Policies
CREATE POLICY "All authenticated users can view pricing lists" ON pricing_lists
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage pricing lists" ON pricing_lists
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Pricing Templates Policies
CREATE POLICY "All authenticated users can view pricing templates" ON pricing_templates
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage pricing templates" ON pricing_templates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Profiles Policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can view profiles in their territory" ON profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (
        p.role IN ('admin', 'manager') OR
        p.territory_id = profiles.territory_id
      )
    )
  );

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can manage all profiles" ON profiles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Territories Policies
CREATE POLICY "All authenticated users can view territories" ON territories
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage territories" ON territories
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- User Analytics Policies
CREATE POLICY "Users can create their own analytics events" ON user_analytics
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own analytics" ON user_analytics
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Warranties Policies
CREATE POLICY "All authenticated users can view active warranties" ON warranties
  FOR SELECT TO authenticated
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ));

CREATE POLICY "Only admins can manage warranties" ON warranties
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Warranty Requirements Policies
CREATE POLICY "All authenticated users can view warranty requirements" ON warranty_requirements
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage warranty requirements" ON warranty_requirements
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  ); 