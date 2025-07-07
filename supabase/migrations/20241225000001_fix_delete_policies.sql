-- Fix RLS policies for estimates table to allow territory managers to delete estimates
-- This migration addresses the issue where territory managers cannot delete estimates

-- First, ensure RLS is enabled (should already be enabled)
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to recreate them properly
DROP POLICY IF EXISTS "Allow anonymous delete" ON estimates;
DROP POLICY IF EXISTS "Territory managers can delete estimates" ON estimates;
DROP POLICY IF EXISTS "Admins can delete estimates" ON estimates;

-- Create policy to allow territory managers and admins to delete estimates
-- Territory managers can only delete estimates in their territory
-- Admins can delete any estimate
CREATE POLICY "Territory managers and admins can delete estimates" ON estimates
  FOR DELETE USING (
    -- Get current user's profile
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (
        -- Admin can delete any estimate
        p.role = 'admin'
        -- Territory manager can delete estimates in their territory
        OR (
          p.role = 'manager' 
          AND p.territory_id IS NOT NULL
          AND estimates.territory_id = p.territory_id
        )
      )
    )
  );

-- Also ensure territory managers can update estimates (for soft delete functionality)
DROP POLICY IF EXISTS "Territory managers can update estimates" ON estimates;
CREATE POLICY "Territory managers can update estimates" ON estimates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (
        -- Admin can update any estimate
        p.role = 'admin'
        -- Territory manager can update estimates in their territory
        OR (
          p.role = 'manager' 
          AND p.territory_id IS NOT NULL
          AND estimates.territory_id = p.territory_id
        )
        -- Sales rep can update their own estimates
        OR (
          p.role = 'rep'
          AND estimates.created_by = p.id
        )
      )
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (
        -- Admin can update any estimate
        p.role = 'admin'
        -- Territory manager can update estimates in their territory
        OR (
          p.role = 'manager' 
          AND p.territory_id IS NOT NULL
          AND estimates.territory_id = p.territory_id
        )
        -- Sales rep can update their own estimates
        OR (
          p.role = 'rep'
          AND estimates.created_by = p.id
        )
      )
    )
  );

-- Grant necessary permissions
GRANT DELETE ON estimates TO authenticated;
GRANT UPDATE ON estimates TO authenticated;

-- Add helpful comments
COMMENT ON POLICY "Territory managers and admins can delete estimates" ON estimates IS 'Allows territory managers to delete estimates in their territory and admins to delete any estimate';
COMMENT ON POLICY "Territory managers can update estimates" ON estimates IS 'Allows territory managers to update estimates in their territory, admins to update any estimate, and sales reps to update their own estimates'; 