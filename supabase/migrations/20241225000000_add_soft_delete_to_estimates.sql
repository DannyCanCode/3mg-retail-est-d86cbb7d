-- Add soft delete functionality to estimates table
-- This migration adds columns to support soft deletes instead of permanent data loss

-- Add soft delete columns to estimates table
DO $$ 
BEGIN 
    -- Add deleted_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimates' AND column_name = 'deleted_at') THEN
        ALTER TABLE estimates ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add deleted_by column if it doesn't exist (references auth.users)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimates' AND column_name = 'deleted_by') THEN
        ALTER TABLE estimates ADD COLUMN deleted_by UUID;
    END IF;
    
    -- Add deletion_reason column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimates' AND column_name = 'deletion_reason') THEN
        ALTER TABLE estimates ADD COLUMN deletion_reason TEXT;
    END IF;
END $$;

-- Add indexes for performance on soft delete queries
CREATE INDEX IF NOT EXISTS idx_estimates_deleted_at ON estimates(deleted_at);
CREATE INDEX IF NOT EXISTS idx_estimates_deleted_by ON estimates(deleted_by);
CREATE INDEX IF NOT EXISTS idx_estimates_not_deleted ON estimates(deleted_at) WHERE deleted_at IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN estimates.deleted_at IS 'Timestamp when estimate was soft deleted (NULL = not deleted)';
COMMENT ON COLUMN estimates.deleted_by IS 'User ID who performed the soft delete';
COMMENT ON COLUMN estimates.deletion_reason IS 'Reason provided for deleting the estimate';

-- Create a view for active (non-deleted) estimates
CREATE OR REPLACE VIEW active_estimates AS
SELECT * FROM estimates WHERE deleted_at IS NULL;

-- Grant access to the view
GRANT SELECT ON active_estimates TO authenticated;
GRANT SELECT ON active_estimates TO anon;

-- Add RPC function for soft delete operation
CREATE OR REPLACE FUNCTION soft_delete_estimate(
  estimate_id UUID,
  reason TEXT DEFAULT 'Deleted by admin'
) RETURNS BOOLEAN AS $$
BEGIN
  -- Update the estimate to mark it as deleted
  UPDATE estimates 
  SET 
    deleted_at = NOW(),
    deleted_by = auth.uid(),
    deletion_reason = reason,
    updated_at = NOW()
  WHERE id = estimate_id AND deleted_at IS NULL;
  
  -- Return true if a row was updated
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RPC function for restoring soft deleted estimates
CREATE OR REPLACE FUNCTION restore_estimate(
  estimate_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- Restore the estimate by clearing delete fields
  UPDATE estimates 
  SET 
    deleted_at = NULL,
    deleted_by = NULL,
    deletion_reason = NULL,
    updated_at = NOW()
  WHERE id = estimate_id AND deleted_at IS NOT NULL;
  
  -- Return true if a row was updated
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on RPC functions
GRANT EXECUTE ON FUNCTION soft_delete_estimate(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_estimate(UUID) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION soft_delete_estimate IS 'Soft delete an estimate instead of permanent removal';
COMMENT ON FUNCTION restore_estimate IS 'Restore a soft-deleted estimate';
COMMENT ON VIEW active_estimates IS 'View of all non-deleted estimates'; 