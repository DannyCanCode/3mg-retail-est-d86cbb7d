-- Add creator information fields to estimates table
-- This allows us to display who created each estimate in the dashboard

DO $$ 
BEGIN 
    -- Add creator_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimates' AND column_name = 'creator_name') THEN
        ALTER TABLE estimates ADD COLUMN creator_name TEXT;
    END IF;
    
    -- Add creator_role column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimates' AND column_name = 'creator_role') THEN
        ALTER TABLE estimates ADD COLUMN creator_role TEXT;
    END IF;
    
    -- Add created_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimates' AND column_name = 'created_by') THEN
        ALTER TABLE estimates ADD COLUMN created_by UUID;
    END IF;
    
END $$; 