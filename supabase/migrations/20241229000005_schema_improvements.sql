-- Schema improvements and missing elements

-- 1. Add missing indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_estimates_created_by ON estimates(created_by);
CREATE INDEX IF NOT EXISTS idx_estimates_territory_id ON estimates(territory_id);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status);
CREATE INDEX IF NOT EXISTS idx_estimates_created_at ON estimates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_estimates_deleted_at ON estimates(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_estimates_owner_id ON estimates(owner_id);
CREATE INDEX IF NOT EXISTS idx_estimates_is_sold ON estimates(is_sold);
CREATE INDEX IF NOT EXISTS idx_estimates_submission_status ON estimates(submission_status);

CREATE INDEX IF NOT EXISTS idx_measurements_created_by ON measurements(created_by);
CREATE INDEX IF NOT EXISTS idx_measurements_territory_id ON measurements(territory_id);
CREATE INDEX IF NOT EXISTS idx_measurements_created_at ON measurements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_measurements_deleted_at ON measurements(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_territory_id ON profiles(territory_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_created_at ON user_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_analytics_event_name ON user_analytics(event_name);

-- 2. Add region column to territories (missing from current schema)
ALTER TABLE territories ADD COLUMN IF NOT EXISTS region text;

-- 3. Add missing foreign key constraints
ALTER TABLE profiles 
  ADD CONSTRAINT profiles_territory_fk 
  FOREIGN KEY (territory_id) 
  REFERENCES territories(id) 
  ON DELETE SET NULL
  IF NOT EXISTS;

ALTER TABLE profiles 
  ADD CONSTRAINT profiles_user_fk 
  FOREIGN KEY (id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE
  IF NOT EXISTS;

ALTER TABLE measurements 
  ADD CONSTRAINT measurements_territory_fk 
  FOREIGN KEY (territory_id) 
  REFERENCES territories(id)
  IF NOT EXISTS;

ALTER TABLE measurements 
  ADD CONSTRAINT measurements_created_by_fk 
  FOREIGN KEY (created_by) 
  REFERENCES auth.users(id)
  IF NOT EXISTS;

ALTER TABLE estimates 
  ADD CONSTRAINT estimates_created_by_fk 
  FOREIGN KEY (created_by) 
  REFERENCES auth.users(id)
  IF NOT EXISTS;

ALTER TABLE estimate_drafts 
  ADD CONSTRAINT estimate_drafts_user_fk 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE
  IF NOT EXISTS;

-- 4. Add updated_at triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for tables that have updated_at
CREATE TRIGGER update_estimates_updated_at BEFORE UPDATE ON estimates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_measurements_updated_at BEFORE UPDATE ON measurements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_lists_updated_at BEFORE UPDATE ON pricing_lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_templates_updated_at BEFORE UPDATE ON pricing_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_territories_updated_at BEFORE UPDATE ON territories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_material_waste_percentage_updated_at BEFORE UPDATE ON material_waste_percentage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_estimate_drafts_updated_at BEFORE UPDATE ON estimate_drafts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Add audit log table for tracking important changes
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  user_id uuid,
  changes jsonb,
  created_at timestamp with time zone DEFAULT now(),
  ip_address inet,
  user_agent text,
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 6. Add estimate status history table
CREATE TABLE IF NOT EXISTS public.estimate_status_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid NOT NULL,
  reason text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT estimate_status_history_pkey PRIMARY KEY (id),
  CONSTRAINT estimate_status_history_estimate_fk FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE,
  CONSTRAINT estimate_status_history_user_fk FOREIGN KEY (changed_by) REFERENCES auth.users(id)
);

CREATE INDEX idx_estimate_status_history_estimate ON estimate_status_history(estimate_id);
CREATE INDEX idx_estimate_status_history_created_at ON estimate_status_history(created_at DESC);

-- 7. Add RLS policies for new tables
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_status_history ENABLE ROW LEVEL SECURITY;

-- Audit logs - admins only
CREATE POLICY "Admins can view all audit logs" ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Estimate status history - viewable by estimate owners and admins
CREATE POLICY "Users can view status history for their estimates" ON estimate_status_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM estimates e
      WHERE e.id = estimate_status_history.estimate_id
      AND (
        e.created_by = auth.uid() OR
        e.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'manager')
        )
      )
    )
  );

-- 8. Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_estimates_territory_status ON estimates(territory_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_estimates_owner_status ON estimates(owner_id, submission_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_territory_role ON profiles(territory_id, role);

-- 9. Add check constraints for data integrity
ALTER TABLE estimates 
  ADD CONSTRAINT check_profit_margin_range 
  CHECK (profit_margin >= 0 AND profit_margin <= 100);

ALTER TABLE material_waste_percentage 
  ADD CONSTRAINT check_waste_percentage_range 
  CHECK (waste_percentage >= 0 AND waste_percentage <= 100);

-- 10. Add missing deletion reason column
ALTER TABLE estimates 
  ADD COLUMN IF NOT EXISTS deletion_reason text;

ALTER TABLE measurements 
  ADD COLUMN IF NOT EXISTS deletion_reason text;

-- 11. Create a view for active estimates (not deleted)
CREATE OR REPLACE VIEW active_estimates AS
SELECT * FROM estimates
WHERE deleted_at IS NULL;

-- 12. Create a view for estimate analytics
CREATE OR REPLACE VIEW estimate_analytics AS
SELECT 
  t.name as territory_name,
  t.region,
  COUNT(DISTINCT e.id) as total_estimates,
  COUNT(DISTINCT CASE WHEN e.status = 'pending' THEN e.id END) as pending_estimates,
  COUNT(DISTINCT CASE WHEN e.status = 'accepted' THEN e.id END) as accepted_estimates,
  COUNT(DISTINCT CASE WHEN e.status = 'rejected' THEN e.id END) as rejected_estimates,
  COUNT(DISTINCT CASE WHEN e.is_sold = true THEN e.id END) as sold_estimates,
  SUM(e.total_price) as total_value,
  AVG(e.profit_margin) as avg_profit_margin,
  DATE_TRUNC('month', e.created_at) as month
FROM estimates e
JOIN territories t ON e.territory_id = t.id
WHERE e.deleted_at IS NULL
GROUP BY t.name, t.region, DATE_TRUNC('month', e.created_at);

-- Grant appropriate permissions
GRANT SELECT ON estimate_analytics TO authenticated;
GRANT SELECT ON active_estimates TO authenticated; 