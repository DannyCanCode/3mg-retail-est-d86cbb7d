-- Add signature fields to estimates table
ALTER TABLE estimates
ADD COLUMN signature_status text DEFAULT 'not_sent' CHECK (signature_status IN ('not_sent', 'pending', 'signed', 'declined')),
ADD COLUMN signature_document_id text,
ADD COLUMN signature_link text,
ADD COLUMN signature_sent_at timestamptz,
ADD COLUMN signature_signed_at timestamptz,
ADD COLUMN signature_declined_at timestamptz,
ADD COLUMN signature_ip_address inet,
ADD COLUMN signed_document_url text;

-- Add indexes for performance
CREATE INDEX idx_estimates_signature_status ON estimates(signature_status);
CREATE INDEX idx_estimates_signature_document_id ON estimates(signature_document_id);

-- Add comments
COMMENT ON COLUMN estimates.signature_status IS 'Status of the e-signature process';
COMMENT ON COLUMN estimates.signature_document_id IS 'SignNow document ID';
COMMENT ON COLUMN estimates.signature_link IS 'Link sent to customer for signing';
COMMENT ON COLUMN estimates.signature_sent_at IS 'When the signature request was sent';
COMMENT ON COLUMN estimates.signature_signed_at IS 'When the document was signed';
COMMENT ON COLUMN estimates.signature_declined_at IS 'When the signature was declined';
COMMENT ON COLUMN estimates.signature_ip_address IS 'IP address of the signer';
COMMENT ON COLUMN estimates.signed_document_url IS 'URL of the signed document in storage'; 