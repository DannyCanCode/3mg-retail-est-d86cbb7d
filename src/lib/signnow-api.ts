import { supabase } from '@/integrations/supabase/client';

interface SignNowConfig {
  apiKey: string;
  clientId: string;
  clientSecret: string;
  basicToken: string;
  baseUrl: string;
}

// SignNow configuration
const config: SignNowConfig = {
  apiKey: import.meta.env.VITE_SIGNNOW_API_KEY || '',
  clientId: import.meta.env.VITE_SIGNNOW_CLIENT_ID || '',
  clientSecret: import.meta.env.VITE_SIGNNOW_CLIENT_SECRET || '',
  basicToken: import.meta.env.VITE_SIGNNOW_BASIC_TOKEN || '',
  baseUrl: 'https://api.signnow.com'
};

// Get OAuth token
export async function getAccessToken(): Promise<string> {
  const response = await fetch(`${config.baseUrl}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${config.basicToken}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      'grant_type': 'password',
      'username': import.meta.env.VITE_SIGNNOW_USERNAME || '',
      'password': import.meta.env.VITE_SIGNNOW_PASSWORD || ''
    })
  });

  if (!response.ok) {
    throw new Error('Failed to get SignNow access token');
  }

  const data = await response.json();
  return data.access_token;
}

// Upload document
export async function uploadDocument(file: File): Promise<string> {
  const token = await getAccessToken();
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${config.baseUrl}/document`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error('Failed to upload document to SignNow');
  }

  const data = await response.json();
  return data.id;
}

// Create signing link
export async function createSigningLink(documentId: string, signerEmail: string): Promise<string> {
  const token = await getAccessToken();
  
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
      subject: '3MG Roofing - Please Sign Your Estimate',
      message: 'Please review and sign the attached roofing estimate.',
      redirect_uri: `${window.location.origin}/estimate-signed`
    })
  });

  if (!response.ok) {
    throw new Error('Failed to create signing link');
  }

  const data = await response.json();
  return data.invite_link;
}

// Send estimate for signature
export async function sendEstimateForSignature(estimateId: string, pdfUrl: string, customerEmail: string) {
  try {
    // 1. Download PDF from Supabase
    const pdfResponse = await fetch(pdfUrl);
    const pdfBlob = await pdfResponse.blob();
    const pdfFile = new File([pdfBlob], `estimate-${estimateId}.pdf`, { type: 'application/pdf' });

    // 2. Upload to SignNow
    const documentId = await uploadDocument(pdfFile);

    // 3. Create signing link
    const signingLink = await createSigningLink(documentId, customerEmail);

    // 4. Update estimate with signing info
    const { error } = await supabase
      .from('estimates')
      .update({
        signature_status: 'pending',
        signature_document_id: documentId,
        signature_link: signingLink,
        signature_sent_at: new Date().toISOString()
      })
      .eq('id', estimateId);

    if (error) throw error;

    return { documentId, signingLink };
  } catch (error) {
    console.error('Error sending estimate for signature:', error);
    throw error;
  }
}

// Check document status
export async function checkDocumentStatus(documentId: string): Promise<string> {
  const token = await getAccessToken();
  
  const response = await fetch(`${config.baseUrl}/document/${documentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to check document status');
  }

  const data = await response.json();
  return data.status;
}

// Download signed document
export async function downloadSignedDocument(documentId: string): Promise<Blob> {
  const token = await getAccessToken();
  
  const response = await fetch(`${config.baseUrl}/document/${documentId}/download`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to download signed document');
  }

  return await response.blob();
} 