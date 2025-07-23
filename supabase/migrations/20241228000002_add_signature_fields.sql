-- Add signature tracking fields to estimates table
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS signature_status TEXT CHECK (signature_status IN ('pending', 'signed', 'failed', 'cancelled'));
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS signature_document_id TEXT;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS signature_link TEXT;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS signature_sent_at TIMESTAMPTZ;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS signature_sent_to TEXT;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS signature_completed_at TIMESTAMPTZ;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS signature_ip_address TEXT;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS signed_document_url TEXT;

-- Add index for signature status queries
CREATE INDEX IF NOT EXISTS idx_estimates_signature_status ON estimates(signature_status);

-- Add comment for documentation
COMMENT ON COLUMN estimates.signature_status IS 'Status of electronic signature: pending, signed, failed, cancelled';
COMMENT ON COLUMN estimates.signature_document_id IS 'SignNow document ID for tracking';
COMMENT ON COLUMN estimates.signature_link IS 'SignNow signing link sent to customer';
COMMENT ON COLUMN estimates.signature_sent_at IS 'When signature request was sent';
COMMENT ON COLUMN estimates.signature_sent_to IS 'Email address signature was sent to';
COMMENT ON COLUMN estimates.signature_completed_at IS 'When signature was completed';
COMMENT ON COLUMN estimates.signature_ip_address IS 'IP address where signature was completed';
COMMENT ON COLUMN estimates.signed_document_url IS 'URL to the signed PDF document'; 