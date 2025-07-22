-- Add homeowner contact fields to estimates table
-- This migration adds email and phone fields for better customer contact management

-- Add owner_email column with email validation
ALTER TABLE public.estimates 
ADD COLUMN IF NOT EXISTS owner_email TEXT 
CHECK (owner_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR owner_email IS NULL);

-- Add owner_phone column
ALTER TABLE public.estimates 
ADD COLUMN IF NOT EXISTS owner_phone TEXT;

-- Add indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_estimates_owner_email ON public.estimates(owner_email);
CREATE INDEX IF NOT EXISTS idx_estimates_owner_phone ON public.estimates(owner_phone);

-- Add comments for documentation
COMMENT ON COLUMN public.estimates.owner_email IS 'Homeowner email address with validation';
COMMENT ON COLUMN public.estimates.owner_phone IS 'Homeowner phone number'; 