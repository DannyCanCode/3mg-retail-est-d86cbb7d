-- Day 1: Sales Rep Implementation - Database Schema and RLS Policies
-- This migration adds support for sales representatives with restricted access

-- ============================================
-- STEP 1: Add columns to estimates table for sales rep workflow
-- ============================================

-- Add job worksheet data columns
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS job_worksheet JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN estimates.job_worksheet IS 'Stores ventilation, accessories, and special requirements from sales rep worksheet';

-- Add submission workflow columns
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS submission_status TEXT DEFAULT 'draft' 
  CHECK (submission_status IN ('draft', 'submitted', 'approved', 'rejected'));
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES profiles(id);
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS manager_notes TEXT;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id);
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_estimates_submission_status ON estimates(submission_status);
CREATE INDEX IF NOT EXISTS idx_estimates_submitted_by ON estimates(submitted_by);

-- ============================================
-- STEP 2: Create job_worksheet_templates table
-- ============================================

CREATE TABLE IF NOT EXISTS job_worksheet_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  ventilation_options JSONB DEFAULT '[]'::jsonb,
  accessory_options JSONB DEFAULT '[]'::jsonb,
  special_requirements JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE job_worksheet_templates ENABLE ROW LEVEL SECURITY;

-- Insert default worksheet template
INSERT INTO job_worksheet_templates (name, description, ventilation_options, accessory_options, special_requirements) 
VALUES (
  'Standard Job Worksheet',
  'Default worksheet template for sales representatives',
  '[
    {"id": "gooseneck", "name": "Gooseneck", "unit": "each", "material_id": "gaf-master-flow-box-vents"},
    {"id": "ridge_vent", "name": "Ridge Vent", "unit": "linear_feet", "material_id": "gaf-cobra-ridge-vent"},
    {"id": "turtle_vent", "name": "Turtle Vent", "unit": "each", "material_id": "generic-box-vents"},
    {"id": "solar_vent", "name": "Solar Vent", "unit": "each", "material_id": "generic-solar-vent"}
  ]'::jsonb,
  '[
    {"id": "pipe_jack_small", "name": "Pipe Jack (1-3\")", "unit": "each", "material_id": "pipe-jack"},
    {"id": "pipe_jack_large", "name": "Pipe Jack (4-6\")", "unit": "each", "material_id": "pipe-jack-large"},
    {"id": "drip_edge", "name": "Drip Edge", "unit": "linear_feet", "material_id": "generic-drip-edge"},
    {"id": "valley_metal", "name": "Valley Metal", "unit": "linear_feet", "material_id": "generic-valley-metal"}
  ]'::jsonb,
  '[
    {"id": "chimney_cricket", "name": "Chimney Cricket", "type": "boolean"},
    {"id": "satellite_removal", "name": "Satellite Dish Removal", "type": "boolean"},
    {"id": "wood_replacement", "name": "Wood Replacement", "type": "text", "placeholder": "Describe wood replacement needs"},
    {"id": "special_notes", "name": "Special Notes", "type": "textarea", "placeholder": "Any additional requirements"}
  ]'::jsonb
) ON CONFLICT DO NOTHING;

-- ============================================
-- STEP 3: Update RLS policies for estimates
-- ============================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can view estimates" ON estimates;
DROP POLICY IF EXISTS "Users can insert estimates" ON estimates;
DROP POLICY IF EXISTS "Users can update estimates" ON estimates;

-- Create role-based policies for viewing estimates
CREATE POLICY "Admins can view all estimates" ON estimates
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Managers can view territory estimates" ON estimates
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'manager' AND
    (
      territory_id = (SELECT territory_id FROM profiles WHERE id = auth.uid()) OR
      territory_id IS NULL
    ) AND
    deleted_at IS NULL
  );

CREATE POLICY "Sales reps can view own estimates" ON estimates
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'rep' AND
    created_by = auth.uid() AND
    deleted_at IS NULL
  );

-- Create policies for inserting estimates
CREATE POLICY "Admins can insert any estimate" ON estimates
  FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Managers can insert estimates" ON estimates
  FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'manager'
  );

CREATE POLICY "Sales reps can insert own estimates" ON estimates
  FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'rep' AND
    created_by = auth.uid()
  );

-- Create policies for updating estimates
CREATE POLICY "Admins can update any estimate" ON estimates
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Managers can update territory estimates" ON estimates
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'manager' AND
    (
      territory_id = (SELECT territory_id FROM profiles WHERE id = auth.uid()) OR
      territory_id IS NULL
    )
  );

CREATE POLICY "Sales reps can update own draft estimates" ON estimates
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'rep' AND
    created_by = auth.uid() AND
    submission_status = 'draft'
  );

-- ============================================
-- STEP 4: Create RLS policies for job worksheet templates
-- ============================================

CREATE POLICY "Anyone can view active worksheet templates" ON job_worksheet_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage worksheet templates" ON job_worksheet_templates
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ============================================
-- STEP 5: Create function to handle estimate submission
-- ============================================

CREATE OR REPLACE FUNCTION submit_estimate_for_approval(
  p_estimate_id TEXT,
  p_worksheet_data JSONB
) RETURNS JSONB AS $$
DECLARE
  v_estimate estimates%ROWTYPE;
  v_user_role TEXT;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();
  
  -- Get estimate
  SELECT * INTO v_estimate FROM estimates WHERE id = p_estimate_id;
  
  -- Validate permissions
  IF v_estimate IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Estimate not found');
  END IF;
  
  IF v_estimate.created_by != auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'You can only submit your own estimates');
  END IF;
  
  IF v_estimate.submission_status != 'draft' THEN
    RETURN json_build_object('success', false, 'error', 'Only draft estimates can be submitted');
  END IF;
  
  -- Update estimate
  UPDATE estimates SET
    job_worksheet = p_worksheet_data,
    submission_status = 'submitted',
    submitted_at = NOW(),
    submitted_by = auth.uid(),
    updated_at = NOW()
  WHERE id = p_estimate_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Estimate submitted for approval'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION submit_estimate_for_approval TO authenticated;

-- ============================================
-- STEP 6: Create function for managers to approve/reject
-- ============================================

CREATE OR REPLACE FUNCTION review_submitted_estimate(
  p_estimate_id TEXT,
  p_action TEXT, -- 'approve' or 'reject'
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_estimate estimates%ROWTYPE;
  v_user_role TEXT;
  v_user_territory UUID;
BEGIN
  -- Get user role and territory
  SELECT role, territory_id INTO v_user_role, v_user_territory 
  FROM profiles WHERE id = auth.uid();
  
  -- Check if user is admin or manager
  IF v_user_role NOT IN ('admin', 'manager') THEN
    RETURN json_build_object('success', false, 'error', 'Only managers and admins can review estimates');
  END IF;
  
  -- Get estimate
  SELECT * INTO v_estimate FROM estimates WHERE id = p_estimate_id;
  
  -- Validate estimate exists and is submitted
  IF v_estimate IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Estimate not found');
  END IF;
  
  IF v_estimate.submission_status != 'submitted' THEN
    RETURN json_build_object('success', false, 'error', 'Only submitted estimates can be reviewed');
  END IF;
  
  -- Check territory access for managers
  IF v_user_role = 'manager' AND v_estimate.territory_id != v_user_territory THEN
    RETURN json_build_object('success', false, 'error', 'You can only review estimates in your territory');
  END IF;
  
  -- Update estimate based on action
  IF p_action = 'approve' THEN
    UPDATE estimates SET
      status = 'approved',
      submission_status = 'approved',
      approved_by = auth.uid(),
      approved_at = NOW(),
      manager_notes = p_notes,
      updated_at = NOW()
    WHERE id = p_estimate_id;
  ELSIF p_action = 'reject' THEN
    UPDATE estimates SET
      status = 'rejected',
      submission_status = 'rejected',
      rejection_reason = p_notes,
      manager_notes = p_notes,
      updated_at = NOW()
    WHERE id = p_estimate_id;
  ELSE
    RETURN json_build_object('success', false, 'error', 'Invalid action. Use "approve" or "reject"');
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Estimate ' || p_action || 'd successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION review_submitted_estimate TO authenticated;

-- ============================================
-- STEP 7: Add helpful comments
-- ============================================

COMMENT ON COLUMN estimates.job_worksheet IS 'Stores selections from sales rep job worksheet including ventilation, accessories, and special requirements';
COMMENT ON COLUMN estimates.submission_status IS 'Workflow status for sales rep submissions: draft (editable), submitted (pending review), approved, rejected';
COMMENT ON COLUMN estimates.submitted_at IS 'Timestamp when sales rep submitted estimate for approval';
COMMENT ON COLUMN estimates.manager_notes IS 'Notes from manager during review process';
COMMENT ON TABLE job_worksheet_templates IS 'Templates defining available options for sales rep job worksheets'; 