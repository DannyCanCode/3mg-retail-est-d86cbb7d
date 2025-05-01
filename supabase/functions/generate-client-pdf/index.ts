// supabase/functions/generate-client-pdf/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1?pin=v111' // Ensure pdf-lib works in Deno env

interface MaterialData {
    name: string;
    unit: string;
    price?: number; // Add price if needed by filtering logic
    // include other fields if necessary
}

interface EstimateData {
  id: string;
  customer_name?: string | null;
  customer_address?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  total_price?: number | null;
  materials?: Record<string, MaterialData>; // Use MaterialData interface
  quantities?: Record<string, number>;
  created_at?: string | null;
  job_type?: string | null;
}

serve(async (req) => {
  // 1. Handle CORS and OPTIONS request (Standard Supabase Function setup)
  // IMPORTANT: Adjust Allow-Origin for production environments!
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Use your specific frontend URL in production,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { estimateId } = await req.json()
    if (!estimateId) {
      throw new Error("Estimate ID is required.")
    }

    // 2. Create Supabase Admin Client (Use environment variables/secrets)
    // Use the new secret names
    const supabaseUrl = Deno.env.get('PROJECT_SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('PROJECT_SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Missing Supabase project environment variables/secrets."); // Updated error message
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

    // 3. Fetch Estimate Data
    const { data: estimateResult, error: fetchError } = await supabaseClient
      .from('estimates')
      .select('*') // Select all needed fields
      .eq('id', estimateId)
      .single()

    if (fetchError) throw fetchError
    if (!estimateResult) throw new Error("Estimate not found.")

    // Parse JSON fields (assuming they are stored as strings)
    let estimateData: EstimateData;
    try {
        estimateData = {
            ...estimateResult,
            materials: JSON.parse(estimateResult.materials || '{}'),
            quantities: JSON.parse(estimateResult.quantities || '{}'),
            // Add parsing for labor_rates, measurements if needed by PDF logic
        } as EstimateData;
    } catch (e) {
        console.error("Failed to parse JSON fields from estimate:", e);
        throw new Error("Error reading estimate data format.");
    }
    

    // --- 4. PDF Generation using pdf-lib ---
    const pdfDoc = await PDFDocument.create()
    let page = pdfDoc.addPage([612, 792]) // Use let for page
    const { width, height } = page.getSize()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const greenColor = rgb(0, 0.5, 0) // Define a green color (adjust as needed)
    const margin = 50;
    let currentY = height - margin; // Start drawing from top margin

    // --- PDF Content (Mimic the sample PDF layout) ---
    
    // Header
    // TODO: Replace with actual logo embedding if desired
    page.drawText('3MG Roofing', { x: margin, y: currentY, font: boldFont, size: 16, color: greenColor });
    currentY -= 15;
    page.drawText('152 N. Hwy 17-92 Ste 100', { x: margin, y: currentY, font: font, size: 9 });
    currentY -= 11;
    page.drawText('Winter Park, FL 32789', { x: margin, y: currentY, font: font, size: 9 });
    currentY -= 11;
    page.drawText('Phone: 407-xxx-xxxx', { x: margin, y: currentY, font: font, size: 9 }); // TODO: Add real phone

    // Date and Claim Info (Right Aligned)
    const dateText = `Date: ${new Date(estimateData.created_at || Date.now()).toLocaleDateString()}`;
    const dateWidth = boldFont.widthOfTextAtSize(dateText, 10);
    page.drawText(dateText, { x: width - margin - dateWidth, y: height - margin, font: boldFont, size: 10 });

    const claimText = `Job Type: ${estimateData.job_type || 'RETAIL'}`;
    const claimWidth = font.widthOfTextAtSize(claimText, 9);
    page.drawText(claimText, { x: width - margin - claimWidth, y: height - margin - 15, font: font, size: 9 });
    // TODO: Add other Company Rep info if needed

    currentY -= 30; // Space before customer info

    // Customer Info
    page.drawText('Customer Information', { x: margin, y: currentY, font: boldFont, size: 12, color: greenColor });
    currentY -= 15;
    page.drawText(estimateData.customer_name || 'N/A', { x: margin, y: currentY, font: boldFont, size: 10 });
    currentY -= 12;
    page.drawText(estimateData.customer_address || 'N/A', { x: margin + 5, y: currentY, font: font, size: 10 }); // Indent address slightly
    currentY -= 12;
    page.drawText(`Email: ${estimateData.customer_email || 'N/A'}`, { x: margin + 5, y: currentY, font: font, size: 10 });
    currentY -= 12;
    page.drawText(`Phone: ${estimateData.customer_phone || 'N/A'}`, { x: margin + 5, y: currentY, font: font, size: 10 });

    currentY -= 30; // Space before items

    // Itemized Section Header
    page.drawText('3MG Roof Replacement Section', { x: margin, y: currentY, font: boldFont, size: 12, color: greenColor });
    currentY -= 15;
    const itemStartX = margin + 10;
    const qtyX = width - 150;
    const unitX = width - 100;

    // Column Headers
    page.drawText('Item Description', { x: itemStartX, y: currentY, font: boldFont, size: 10 });
    page.drawText('Qty', { x: qtyX, y: currentY, font: boldFont, size: 10 });
    page.drawText('Unit', { x: unitX, y: currentY, font: boldFont, size: 10 });
    currentY -= 5;
    page.drawLine({ start: { x: margin, y: currentY }, end: { x: width - margin, y: currentY }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
    currentY -= 15;

    // Materials List (No Prices)
    if (estimateData.materials && estimateData.quantities) {
      for (const materialId in estimateData.quantities) {
        const material = estimateData.materials[materialId];
        const quantity = estimateData.quantities[materialId];
        if (material && quantity > 0 && material.price !== 0) { // Filter out items with price 0 if they are addons/systems handled separately
            // Simple word wrapping approximation
            const maxLineWidth = qtyX - itemStartX - 10;
            const words = material.name.split(' ');
            let currentLine = '';
            for (const word of words) {
                const testLine = currentLine + (currentLine ? ' ' : '') + word;
                if (font.widthOfTextAtSize(testLine, 10) > maxLineWidth) {
                    page.drawText(currentLine, { x: itemStartX, y: currentY, font: font, size: 10 });
                    currentY -= 12;
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            }
            page.drawText(currentLine, { x: itemStartX, y: currentY, font: font, size: 10 });
            
            page.drawText(quantity.toString(), { x: qtyX, y: currentY, font: font, size: 10 });
            page.drawText(material.unit, { x: unitX, y: currentY, font: font, size: 10 });
            currentY -= 12; 
            if (currentY < 150) { // Check if space needed for Total & Static text
                page = pdfDoc.addPage([612, 792]) // Reassign page
                currentY = height - margin; 
                // TODO: Add page headers/footers if needed
            }
        }
      }
    }
    
    currentY -= 15;
    page.drawLine({ start: { x: margin, y: currentY }, end: { x: width - margin, y: currentY }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
    currentY -= 20;

    // Total Section
    const totalLabel = 'TOTAL';
    const totalValue = (estimateData.total_price ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    const totalLabelWidth = boldFont.widthOfTextAtSize(totalLabel, 12);
    const totalValueWidth = boldFont.widthOfTextAtSize(totalValue, 12);
    page.drawText(totalLabel, { x: width - margin - totalValueWidth - totalLabelWidth - 10, y: currentY, font: boldFont, size: 12 });
    page.drawText(totalValue, { x: width - margin - totalValueWidth, y: currentY, font: boldFont, size: 12 });

    currentY -= 40; // Space before static text

    // Static Text Sections (Terms, etc.) - REQUIRES COPYING TEXT FROM SAMPLE
    // This is a placeholder - replace with actual text and formatting
    page.drawText('GENERAL TERMS AND CONDITIONS', { x: margin, y: currentY, font: boldFont, size: 10 });
    currentY -= 12;
    const termsText = "1. Scope of Work: Contractor agrees to perform... (COPY ALL TEXT HERE) ...applicable Florida Statutes.";
    // Need to implement text wrapping or draw line by line
    page.drawText(termsText.substring(0, 100) + '...', { x: margin, y: currentY, font: font, size: 7, lineHeight: 9, maxWidth: width - (2 * margin) });
    // Repeat for all paragraphs and sections (Warning, Additional Terms, Signatures etc.)
    // This will likely require multiple pages.

    // --- End PDF Content ---

    // 5. Save PDF to Buffer
    const pdfBytes = await pdfDoc.save()

    // 6. Upload to Supabase Storage
    const bucketName = 'estimates'; // IMPORTANT: Use your actual bucket name
    const filePath = `client-pdfs/estimate-${estimateId}-${Date.now()}.pdf`; // Use a subfolder
    
    console.log(`Uploading PDF to bucket: ${bucketName}, path: ${filePath}`);
    const { error: uploadError } = await supabaseClient.storage
      .from(bucketName)
      .upload(filePath, pdfBytes, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: true 
      })

    if (uploadError) {
        console.error("Storage Upload Error:", uploadError);
        throw new Error(`Failed to upload PDF to storage: ${uploadError.message}`);
    }

    // 7. Get Public URL
    console.log("Getting public URL...");
    const { data: urlData } = supabaseClient.storage
      .from(bucketName)
      .getPublicUrl(filePath)

    if (!urlData?.publicUrl) {
        console.error("Failed to get public URL after upload.");
        throw new Error("Could not get public URL for PDF.")
    }

    console.log("Public URL obtained:", urlData.publicUrl);

    // 8. Return URL
    return new Response(
      JSON.stringify({ url: urlData.publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } } 
    )

  } catch (error) {
    console.error("Error in Edge Function:", error)
    return new Response(
        JSON.stringify({ error: error.message }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } } 
    )
  }
}) 