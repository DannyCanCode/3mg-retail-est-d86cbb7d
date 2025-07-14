-- Add job_worksheet field to estimates table
ALTER TABLE public.estimates 
ADD COLUMN IF NOT EXISTS job_worksheet JSONB DEFAULT '{}'::jsonb;

-- Add sales rep specific fields
ALTER TABLE public.estimates 
ADD COLUMN IF NOT EXISTS submission_status TEXT DEFAULT 'draft' 
CHECK (submission_status IN ('draft', 'submitted', 'approved', 'rejected'));

ALTER TABLE public.estimates 
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

ALTER TABLE public.estimates 
ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.estimates 
ADD COLUMN IF NOT EXISTS manager_notes TEXT;

ALTER TABLE public.estimates 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Add customer info extraction fields to measurements
ALTER TABLE public.measurements
ADD COLUMN IF NOT EXISTS customer_name TEXT;

ALTER TABLE public.measurements
ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Create index for better performance on submission queries
CREATE INDEX IF NOT EXISTS idx_estimates_submission_status ON public.estimates(submission_status);
CREATE INDEX IF NOT EXISTS idx_estimates_submitted_by ON public.estimates(submitted_by);
CREATE INDEX IF NOT EXISTS idx_estimates_territory_submission ON public.estimates(territory_id, submission_status);

-- Add RLS policies for sales reps to create and view their own estimates
CREATE POLICY "Sales reps can create estimates" ON public.estimates
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = created_by
);

CREATE POLICY "Sales reps can view their own estimates" ON public.estimates
FOR SELECT TO authenticated
USING (
  auth.uid() = created_by 
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Sales reps can update their draft estimates" ON public.estimates
FOR UPDATE TO authenticated
USING (
  auth.uid() = created_by 
  AND submission_status = 'draft'
)
WITH CHECK (
  auth.uid() = created_by 
  AND submission_status IN ('draft', 'submitted')
);

-- Territory managers can view and update estimates in their territory
CREATE POLICY "Territory managers can view territory estimates" ON public.estimates
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'manager'
    AND profiles.territory_id = estimates.territory_id
  )
);

CREATE POLICY "Territory managers can update territory estimates" ON public.estimates
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'manager'
    AND profiles.territory_id = estimates.territory_id
  )
);

-- Add comment for documentation
COMMENT ON COLUMN public.estimates.job_worksheet IS 'Stores all job worksheet form data including basic info, property access, shingle roof details, ventilation, gutters, solar, etc.';
COMMENT ON COLUMN public.estimates.submission_status IS 'Tracks estimate workflow: draft (being created), submitted (pending approval), approved, rejected';
COMMENT ON COLUMN public.measurements.customer_name IS 'Customer name extracted from PDF';
COMMENT ON COLUMN public.measurements.company_name IS 'Company name extracted from PDF'; 