import { supabase } from '@/integrations/supabase/client';

// Types
interface SignNowConfig {
  clientId: string;
  clientSecret: string;
  basicToken: string;
  username: string;
  password: string;
  baseUrl: string;
}

// SignNow API Configuration
const SIGNNOW_API_BASE = 'https://api.signnow.com';

// SignNow configuration
const config: SignNowConfig = {
  clientId: import.meta.env.VITE_SIGNNOW_CLIENT_ID || '',
  clientSecret: import.meta.env.VITE_SIGNNOW_CLIENT_SECRET || '',
  basicToken: import.meta.env.VITE_SIGNNOW_BASIC_TOKEN || '',
  username: import.meta.env.VITE_SIGNNOW_USERNAME || '',
  password: import.meta.env.VITE_SIGNNOW_PASSWORD || '',
  baseUrl: SIGNNOW_API_BASE
};

// Get OAuth token
export const getSignNowToken = async (): Promise<string> => {
  const response = await fetch(`${config.baseUrl}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${config.clientId}:${config.clientSecret}`)}`
    },
    body: new URLSearchParams({
      username: config.username,
      password: config.password,
      grant_type: 'password',
      scope: '*'
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to get token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
};

// Upload document to SignNow
export const uploadDocument = async (token: string, file: Blob, fileName: string): Promise<{ id: string }> => {
  const formData = new FormData();
  formData.append('file', file, fileName);

  const response = await fetch(`${config.baseUrl}/document`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Failed to upload document: ${response.statusText}`);
  }

  return await response.json();
};

// Create signing link
export const createSigningLink = async (token: string, documentId: string, signerEmail: string): Promise<{ link: string }> => {
  const response = await fetch(`${config.baseUrl}/document/${documentId}/invite`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      to: [{
        email: signerEmail,
        role: 'Signer',
        order: 1,
        authentication_type: 'email'
      }],
      subject: 'Please sign your roofing estimate',
      message: 'Your roofing estimate is ready for signature. Please review and sign.'
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to create signing link: ${response.statusText}`);
  }

  const result = await response.json();
  // Generate the signing link
  const link = `https://app.signnow.com/invite/${result.id}`;
  return { link };
};

// Check document status
export const checkDocumentStatus = async (token: string, documentId: string): Promise<{ status: string; ip_address?: string }> => {
  const response = await fetch(`${config.baseUrl}/document/${documentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to check document status: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Check if all required signatures are completed
  const allSigned = data.signatures && data.signatures.length > 0;
  
  return {
    status: allSigned ? 'completed' : 'pending',
    ip_address: data.signatures?.[0]?.ip_address
  };
};

// Export with both names for compatibility
export const getDocumentStatus = checkDocumentStatus;

// Download signed document
export const downloadSignedDocument = async (token: string, documentId: string): Promise<Blob> => {
  const response = await fetch(`${config.baseUrl}/document/${documentId}/download?type=merged`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to download document: ${response.statusText}`);
  }

  return await response.blob();
};

// Send estimate for signature
export async function sendEstimateForSignature(
  estimateId: string,
  pdfFile: File,
  customerEmail: string
): Promise<void> {
  try {
    // Get token first
    const token = await getSignNowToken();
    
    // Upload document
    const uploadResult = await uploadDocument(token, pdfFile, pdfFile.name);
    const documentId = uploadResult.id;
    
    // Create signing link
    const { link: signingLink } = await createSigningLink(token, documentId, customerEmail);
    
    // Update estimate with signature info (remove signature_status since it doesn't exist in types yet)
    const { error } = await supabase
      .from('estimates')
      .update({
        // We'll add these fields after running the migration
        // signature_status: 'pending',
        // signature_document_id: documentId,
        // signature_link: signingLink,
        // signature_sent_at: new Date().toISOString()
      })
      .eq('id', estimateId);
    
    if (error) throw error;
    
    // TODO: Send email to customer with signing link
    console.log('Signing link:', signingLink);
    
  } catch (error) {
    console.error('Error sending estimate for signature:', error);
    throw error;
  }
} 