-- Create estimate_drafts table for auto-save functionality
-- This is separate from the main estimates table to store work-in-progress data

CREATE TABLE IF NOT EXISTS estimate_drafts (
  id TEXT PRIMARY KEY,
  estimate_data JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_estimate_drafts_user_id ON estimate_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_estimate_drafts_updated_at ON estimate_drafts(updated_at);
CREATE INDEX IF NOT EXISTS idx_estimate_drafts_version ON estimate_drafts(version);

-- Add RLS (Row Level Security)
ALTER TABLE estimate_drafts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own draft estimates
CREATE POLICY "Users can access their own draft estimates"
  ON estimate_drafts
  FOR ALL
  USING (auth.uid() = user_id);

-- Policy: Users can insert drafts (user_id will be set by trigger)
CREATE POLICY "Users can insert draft estimates"
  ON estimate_drafts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Function to automatically set user_id and update timestamps
CREATE OR REPLACE FUNCTION set_estimate_draft_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Set user_id from current auth user if not provided
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  
  -- Always update the updated_at timestamp
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically set user_id and timestamps
CREATE TRIGGER estimate_draft_set_user_trigger
  BEFORE INSERT OR UPDATE ON estimate_drafts
  FOR EACH ROW
  EXECUTE FUNCTION set_estimate_draft_user();

-- RPC function for optimistic locking with version check
CREATE OR REPLACE FUNCTION save_estimate_with_version(
  p_id TEXT,
  p_data JSONB,
  p_expected_version INTEGER
) RETURNS TABLE(
  success BOOLEAN,
  new_version INTEGER,
  conflict_data JSONB
) AS $$
DECLARE
  current_version INTEGER;
  current_data JSONB;
  new_version_num INTEGER;
BEGIN
  -- Check if record exists and get current version
  SELECT version, estimate_data INTO current_version, current_data
  FROM estimate_drafts
  WHERE id = p_id AND user_id = auth.uid();
  
  -- If record doesn't exist, create it
  IF NOT FOUND THEN
    INSERT INTO estimate_drafts (id, estimate_data, version, user_id)
    VALUES (p_id, p_data, 1, auth.uid())
    RETURNING version INTO new_version_num;
    
    RETURN QUERY SELECT TRUE, new_version_num, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check for version conflict
  IF current_version != p_expected_version THEN
    -- Return conflict with current data
    RETURN QUERY SELECT FALSE, current_version, current_data;
    RETURN;
  END IF;
  
  -- Update with new version
  UPDATE estimate_drafts
  SET estimate_data = p_data,
      version = version + 1,
      updated_at = NOW()
  WHERE id = p_id AND user_id = auth.uid()
  RETURNING version INTO new_version_num;
  
  RETURN QUERY SELECT TRUE, new_version_num, NULL::JSONB;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for authenticated users
GRANT ALL ON estimate_drafts TO authenticated;
GRANT EXECUTE ON FUNCTION save_estimate_with_version(TEXT, JSONB, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION set_estimate_draft_user() TO authenticated;

-- Add helpful comments
COMMENT ON TABLE estimate_drafts IS 'Auto-save drafts for estimate creation workflow';
COMMENT ON COLUMN estimate_drafts.id IS 'Client-generated UUID for the estimate draft';
COMMENT ON COLUMN estimate_drafts.estimate_data IS 'Complete EstimateData object as JSONB';
COMMENT ON COLUMN estimate_drafts.version IS 'Optimistic locking version number';
COMMENT ON COLUMN estimate_drafts.user_id IS 'User who owns this draft (set automatically)';
COMMENT ON FUNCTION save_estimate_with_version IS 'Atomic save with version conflict detection'; 