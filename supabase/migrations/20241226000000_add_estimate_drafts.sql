-- Add estimate_drafts table for server-side auto-save storage
-- This enables the shift from client-heavy to server-centric architecture

-- Create estimate_drafts table for storing draft estimates
CREATE TABLE IF NOT EXISTS estimate_drafts (
    id TEXT PRIMARY KEY,
    estimate_data JSONB NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE estimate_drafts ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_estimate_drafts_user_id ON estimate_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_estimate_drafts_updated_at ON estimate_drafts(updated_at);
CREATE INDEX IF NOT EXISTS idx_estimate_drafts_version ON estimate_drafts(version);

-- RLS Policies - Users can only access their own drafts
CREATE POLICY "Users can view their own estimate drafts" ON estimate_drafts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own estimate drafts" ON estimate_drafts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own estimate drafts" ON estimate_drafts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own estimate drafts" ON estimate_drafts
    FOR DELETE USING (auth.uid() = user_id);

-- Create RPC function for optimistic locking and version control
CREATE OR REPLACE FUNCTION save_estimate_with_version(
    p_id TEXT,
    p_data JSONB,
    p_expected_version INTEGER
) RETURNS JSONB AS $$
DECLARE
    current_version INTEGER;
    new_version INTEGER;
    current_data JSONB;
BEGIN
    -- Get current version and data
    SELECT version, estimate_data INTO current_version, current_data 
    FROM estimate_drafts 
    WHERE id = p_id AND user_id = auth.uid();
    
    -- Check version conflict
    IF current_version IS NOT NULL AND current_version != p_expected_version THEN
        RETURN json_build_object(
            'success', false,
            'conflict', true,
            'current_version', current_version,
            'conflict_data', current_data,
            'message', 'Data was modified by another session'
        );
    END IF;
    
    -- Calculate new version
    new_version := COALESCE(current_version, 0) + 1;
    
    -- Update or insert with new version
    INSERT INTO estimate_drafts (id, estimate_data, version, user_id)
    VALUES (p_id, p_data, new_version, auth.uid())
    ON CONFLICT (id) DO UPDATE SET 
        estimate_data = EXCLUDED.estimate_data,
        version = new_version,
        updated_at = NOW()
    WHERE estimate_drafts.user_id = auth.uid(); -- Security: only update own records
    
    -- Return success response
    RETURN json_build_object(
        'success', true,
        'new_version', new_version,
        'message', 'Estimate draft saved successfully'
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Return error response
        RETURN json_build_object(
            'success', false,
            'error', true,
            'message', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to authenticated users
GRANT ALL ON estimate_drafts TO authenticated;
GRANT EXECUTE ON FUNCTION save_estimate_with_version TO authenticated;

-- Add helpful comment
COMMENT ON TABLE estimate_drafts IS 'Server-side storage for estimate drafts with optimistic locking and version control';
COMMENT ON FUNCTION save_estimate_with_version IS 'Atomically saves estimate drafts with version conflict detection'; 