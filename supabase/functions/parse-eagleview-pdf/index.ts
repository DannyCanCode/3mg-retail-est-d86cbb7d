
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get OpenAI API key from environment variable
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Maximum size for PDFs in characters (bytes) - set much lower than OpenAI's limit to prevent token issues
const MAX_PDF_SIZE = 200000; // ~200KB which should be safely under OpenAI's token limit

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64, fileName, timestamp, requestId = crypto.randomUUID() } = await req.json();
    
    console.log(`[${requestId}] Processing file: ${fileName} at timestamp ${timestamp}`);
    
    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ error: 'No PDF content provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check file size before proceeding
    const fileSize = pdfBase64.length;
    console.log(`[${requestId}] File size (base64 length): ${fileSize} characters`);
    
    // Warn about large files
    let wasTruncated = false;
    let processedPdfBase64 = pdfBase64;
    
    if (fileSize > MAX_PDF_SIZE) {
      console.warn(`[${requestId}] Warning: PDF is very large (${fileSize} chars). Truncating to ${MAX_PDF_SIZE} chars.`);
      processedPdfBase64 = pdfBase64.substring(0, MAX_PDF_SIZE);
      wasTruncated = true;
    }

    try {
      console.log(`[${requestId}] Starting PDF processing with OpenAI`);
      
      const extractedMeasurements = await extractMeasurementsWithOpenAI(processedPdfBase64, fileName, requestId, wasTruncated);
      
      // Check if the response matches the example values from our prompt
      const isExampleData = 
        extractedMeasurements.ridgeLength === 105 &&
        extractedMeasurements.ridgeCount === 6 &&
        extractedMeasurements.totalArea === 2865;
      
      if (isExampleData) {
        console.error(`[${requestId}] WARNING: OpenAI returned example data for ${fileName}`);
        return new Response(
          JSON.stringify({ 
            error: 'The AI returned example values instead of parsing your PDF. Please try again or contact support.',
            requestId: requestId
          }),
          { 
            status: 422, 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' 
            } 
          }
        );
      }
      
      console.log(`[${requestId}] Successfully extracted measurements for ${fileName}`);
      
      // Return the parsed data
      return new Response(
        JSON.stringify({ 
          message: 'PDF parsed successfully',
          measurements: extractedMeasurements,
          truncated: wasTruncated,
          requestId: requestId
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json', 
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
          } 
        }
      );
    } catch (openAIError) {
      console.error(`[${requestId}] Error with OpenAI processing:`, openAIError);
      
      // Return an error response
      return new Response(
        JSON.stringify({ 
          error: 'Failed to process PDF with OpenAI. The file may be too large or in an unsupported format.',
          details: openAIError.message,
          fileSize: fileSize,
          requestId: requestId
        }),
        { 
          status: 500, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json', 
            'Cache-Control': 'no-store, no-cache'
          } 
        }
      );
    }
  } catch (error) {
    const errorId = crypto.randomUUID();
    console.error(`[${errorId}] Error processing PDF:`, error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        errorId: errorId
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store, no-cache' } }
    );
  }
});

async function extractMeasurementsWithOpenAI(pdfBase64: string, fileName: string, requestId: string, wasTruncated: boolean = false) {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  console.log(`[${requestId}] Sending request to OpenAI for ${fileName}`);
  
  // For debugging - check the first few characters of the base64 data
  const base64Preview = pdfBase64.substring(0, 30) + "...";
  console.log(`[${requestId}] PDF base64 preview: ${base64Preview}`);

  // Use only a small portion of the PDF for processing
  // This significantly reduces token usage while still capturing key measurements
  const truncatedForProcessing = pdfBase64.length > 100000 
    ? pdfBase64.substring(0, 100000) 
    : pdfBase64;

  // Prepare the user message based on whether the PDF was truncated
  const userMessage = wasTruncated 
    ? `I'm uploading part of an EagleView PDF named "${fileName}" because it's too large to process in one go. Please try to extract whatever measurements you can find in this portion.` 
    : `I'm uploading an EagleView PDF named "${fileName}".`;

  // Send the request to OpenAI
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // Using a smaller model with lower context limits but still capable
      messages: [
        {
          role: 'system',
          content: `You are a specialized parser for EagleView roof measurements PDFs. Extract the roof measurements from the provided PDF data.

The measurements to extract are:
- Ridge measurements (length and count)
- Hip measurements (length and count)
- Valley measurements (length and count)
- Rake measurements (length and count)
- Eave/Starter measurements (length and count)
- Drip Edge measurements (total length)
- Parapet Wall measurements (length and count)
- Flashing measurements (length and count)
- Step flashing measurements (length and count)
- Total Penetrations Area (in sq ft)
- Total Roof Area (in sq ft)
- Total Penetrations Perimeter (in ft)
- Predominant Pitch

DO NOT return example values! Use only the values found in the PDF data.`
        },
        {
          role: 'user',
          content: `${userMessage} 
          
Here is a portion of the base64 encoded PDF data:
${truncatedForProcessing}

Extract the roof measurements and return them in a valid JSON format with these fields:
"ridgeLength", "ridgeCount", "hipLength", "hipCount", "valleyLength", "valleyCount", "rakeLength", "rakeCount", "eaveLength", "eaveCount", "dripEdgeLength", "parapetWallLength", "parapetWallCount", "flashingLength", "flashingCount", "stepFlashingLength", "stepFlashingCount", "penetrationsArea", "totalArea", "penetrationsPerimeter", "predominantPitch"

IMPORTANT: Only return values that you can actually find in the PDF. DO NOT use the example values (105, 6, etc.) shown in previous messages. If you cannot find a value, use 0 for numbers or "N/A" for text.`
        }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error(`[${requestId}] OpenAI API error:`, errorData);
    throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
  }

  const result = await response.json();
  const measurementContent = result.choices[0].message.content;
  
  // Log the raw response for debugging
  console.log(`[${requestId}] OpenAI Response:`, measurementContent);
  
  try {
    const measurementData = JSON.parse(measurementContent);
    return measurementData;
  } catch (parseError) {
    console.error(`[${requestId}] Error parsing OpenAI response JSON:`, parseError);
    throw new Error(`Failed to parse OpenAI response: ${parseError.message}`);
  }
}
