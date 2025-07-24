-- Create EagleView orders table
CREATE TABLE IF NOT EXISTS public.eagleview_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id text NOT NULL UNIQUE,
  estimate_id uuid,
  address text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  estimated_completion timestamp with time zone,
  actual_completion timestamp with time zone,
  price numeric,
  rush_order boolean DEFAULT false,
  report_url text,
  report_data jsonb,
  metadata jsonb DEFAULT '{}',
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT eagleview_orders_pkey PRIMARY KEY (id),
  CONSTRAINT eagleview_orders_estimate_id_fkey FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE SET NULL,
  CONSTRAINT eagleview_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_eagleview_orders_order_id ON eagleview_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_eagleview_orders_estimate_id ON eagleview_orders(estimate_id);
CREATE INDEX IF NOT EXISTS idx_eagleview_orders_status ON eagleview_orders(status);
CREATE INDEX IF NOT EXISTS idx_eagleview_orders_created_by ON eagleview_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_eagleview_orders_created_at ON eagleview_orders(created_at DESC);

-- Enable RLS
ALTER TABLE eagleview_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own orders
CREATE POLICY "Users can view their own EagleView orders"
  ON eagleview_orders
  FOR SELECT
  USING (auth.uid() = created_by);

-- Territory managers can view orders in their territory
CREATE POLICY "Territory managers can view orders in their territory"
  ON eagleview_orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'manager'
      AND p.territory_id IN (
        SELECT territory_id FROM estimates e
        WHERE e.id = eagleview_orders.estimate_id
      )
    )
  );

-- Admins can view all orders
CREATE POLICY "Admins can view all EagleView orders"
  ON eagleview_orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Users can create orders
CREATE POLICY "Users can create EagleView orders"
  ON eagleview_orders
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Users can update their own orders
CREATE POLICY "Users can update their own EagleView orders"
  ON eagleview_orders
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Add updated_at trigger
CREATE TRIGGER update_eagleview_orders_updated_at
  BEFORE UPDATE ON eagleview_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE eagleview_orders IS 'Stores EagleView measurement report orders and their status'; 