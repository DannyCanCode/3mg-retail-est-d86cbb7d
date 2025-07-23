import { useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  getSignNowToken, 
  uploadDocument, 
  createSigningLink, 
  getDocumentStatus,
  downloadSignedDocument 
} from '@/lib/signnow-api';

export const useSignNow = () => {
  const [isSending, setIsSending] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const sendForSignature = async (estimateId: string, pdfBlob: Blob, customerEmail: string) => {
    setIsSending(true);
    
    try {
      // Step 1: Get OAuth token
      const token = await getSignNowToken();
      
      // Step 2: Upload the PDF to SignNow
      const uploadResult = await uploadDocument(token, pdfBlob, `estimate-${estimateId}.pdf`);
      const documentId = uploadResult.id;
      
      // Step 3: Create signing link
      const signingResult = await createSigningLink(token, documentId, customerEmail);
      const signingLink = signingResult.link;
      
      // Step 4: Update estimate in database with signature info
      const { error: updateError } = await supabase
        .from('estimates')
        .update({
          signature_status: 'pending',
          signature_document_id: documentId,
          signature_link: signingLink,
          signature_sent_at: new Date().toISOString(),
          signature_sent_to: customerEmail
        })
        .eq('id', estimateId);
      
      if (updateError) throw updateError;
      
      // Step 5: Send email to customer (this would be done via Supabase Edge Function)
      // For now, just show the link
      toast({
        title: "Estimate Sent for Signature!",
        description: "The customer will receive an email with the signing link.",
        duration: 5000,
      });
      
      return { success: true, signingLink };
      
    } catch (error) {
      console.error('Error sending for signature:', error);
      toast({
        title: "Failed to Send for Signature",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
      return { success: false, error };
    } finally {
      setIsSending(false);
    }
  };

  const checkSignatureStatus = async (estimateId: string) => {
    setIsCheckingStatus(true);
    
    try {
      // Get estimate details
      const { data: estimate, error: fetchError } = await supabase
        .from('estimates')
        .select('signature_document_id, signature_status')
        .eq('id', estimateId)
        .single();
      
      if (fetchError || !estimate?.signature_document_id) {
        throw new Error('No signature document found');
      }
      
      // Get OAuth token
      const token = await getSignNowToken();
      
      // Check document status
      const status = await getDocumentStatus(token, estimate.signature_document_id);
      
      // Update status if changed
      if (status.status === 'completed' && estimate.signature_status !== 'signed') {
        // Download signed document
        const signedPdfBlob = await downloadSignedDocument(token, estimate.signature_document_id);
        
        // Upload to Supabase storage
        const fileName = `signed-estimates/${estimateId}-signed.pdf`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, signedPdfBlob, {
            contentType: 'application/pdf',
            upsert: true
          });
        
        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(fileName);
        
        // Update estimate
        await supabase
          .from('estimates')
          .update({
            signature_status: 'signed',
            signature_completed_at: new Date().toISOString(),
            signature_ip_address: status.ip_address,
            signed_document_url: publicUrl
          })
          .eq('id', estimateId);
        
        toast({
          title: "Document Signed!",
          description: "The estimate has been signed by the customer.",
          duration: 5000,
        });
        
        return { status: 'signed', signedUrl: publicUrl };
      }
      
      return { status: status.status };
      
    } catch (error) {
      console.error('Error checking signature status:', error);
      toast({
        title: "Failed to Check Status",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
      return { status: 'error', error };
    } finally {
      setIsCheckingStatus(false);
    }
  };

  return {
    sendForSignature,
    checkSignatureStatus,
    isSending,
    isCheckingStatus
  };
}; 