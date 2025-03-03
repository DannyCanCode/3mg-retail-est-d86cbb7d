CREATE TABLE IF NOT EXISTS public.pricing_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  materials JSONB NOT NULL,
  labor JSONB NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.pricing_lists ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations
CREATE POLICY "Allow all operations for pricing_lists" ON public.pricing_lists USING (true);

-- Grant access to authenticated users
GRANT ALL ON TABLE public.pricing_lists TO authenticated;
GRANT ALL ON TABLE public.pricing_lists TO service_role;
