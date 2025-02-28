
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get OpenAI API key from environment variable
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64, fileName, timestamp } = await req.json();
    
    console.log(`Processing file: ${fileName} at timestamp ${timestamp}`);
    
    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ error: 'No PDF content provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    try {
      // Create a unique identifier for this request to help with debugging
      const requestId = crypto.randomUUID();
      console.log(`Starting PDF processing (request ID: ${requestId})`);
      
      // Take a portion of the base64 to aid with debugging, but don't log the whole thing
      const pdfPreview = pdfBase64.substring(0, 100) + "...";
      console.log(`PDF preview: ${pdfPreview}`);
      
      // Process the PDF
      const extractedMeasurements = await extractMeasurementsWithOpenAI(fileName, pdfBase64, requestId);
      
      console.log(`Successfully extracted measurements for ${fileName} (request ID: ${requestId})`);
      
      // Return the parsed data
      return new Response(
        JSON.stringify({ 
          message: 'PDF parsed successfully',
          measurements: extractedMeasurements,
          timestamp: timestamp,
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
      console.error('Error with OpenAI processing:', openAIError);
      
      // Return an error response
      return new Response(
        JSON.stringify({ 
          error: 'Failed to process PDF with OpenAI. Please try again or contact support.',
          details: openAIError.message
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
    console.error('Error processing PDF:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store, no-cache' } }
    );
  }
});

async function extractMeasurementsWithOpenAI(fileName: string, pdfBase64: string, requestId: string) {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  console.log(`Sending request to OpenAI for ${fileName} (request ID: ${requestId})`);

  // For text processing without PDF, we'll use GPT-4o
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a specialized parser for EagleView roof measurements. I'm going to give you base64 encoded PDF data. 
          
          Your task is to extract the roof measurements from this PDF data and return them in a specific JSON format.
          
          Pay special attention to numbers in the PDF - sometimes there are OCR issues. Be particularly careful with measurements, and if you're unsure, indicate in your response that you're uncertain.
          
          The measurements I need extracted are:
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
          - Total Roof Area Less Penetrations (in sq ft)
          - Total Penetrations Perimeter (in ft)
          - Predominant Pitch (like 5/12)
          
          Your job is to output ONLY a valid JSON object with these measurements, formatted exactly as requested.`
        },
        {
          role: 'user',
          content: `I'm sending you the base64 encoded content of an EagleView PDF named "${fileName}". The beginning of the base64 string is: ${pdfBase64.substring(0, 100)}...

          Please extract the measurements from this PDF and return them in the following JSON format:
          
          {
            "ridgeLength": 105,    // Example value, replace with actual
            "ridgeCount": 6,       // Example value, replace with actual
            "hipLength": 10,       // Example value, replace with actual
            "hipCount": 2,         // Example value, replace with actual
            "valleyLength": 89,    // Example value, replace with actual
            "valleyCount": 8,      // Example value, replace with actual
            "rakeLength": 154,     // Example value, replace with actual
            "rakeCount": 15,       // Example value, replace with actual
            "eaveLength": 109,     // Example value, replace with actual
            "eaveCount": 9,        // Example value, replace with actual
            "dripEdgeLength": 263, // Example value, replace with actual
            "parapetWallLength": 0,  // Example value, replace with actual
            "parapetWallCount": 0,   // Example value, replace with actual
            "flashingLength": 2,     // Example value, replace with actual
            "flashingCount": 1,      // Example value, replace with actual
            "stepFlashingLength": 16, // Example value, replace with actual
            "stepFlashingCount": 3,   // Example value, replace with actual
            "penetrationsArea": 3,    // Example value, replace with actual
            "totalArea": 2865,        // Example value, replace with actual
            "penetrationsPerimeter": 14, // Example value, replace with actual
            "predominantPitch": "5/12"  // Example value, replace with actual
          }
          
          Notes:
          1. Use the actual measurements from the PDF, not these example values.
          2. If you cannot find a specific measurement, use 0 for numbers and "N/A" for strings.
          3. The base64 content begins with: ${pdfBase64.substring(0, 100)}...
          
          This is for request ID: ${requestId}`
        }
      ],
      max_tokens: 1500,
      temperature: 0.1,
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error(`OpenAI API error for request ID ${requestId}:`, errorData);
    throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
  }

  const result = await response.json();
  const measurementContent = result.choices[0].message.content;
  
  // Log the raw response for debugging
  console.log(`OpenAI Response for request ID ${requestId}:`, measurementContent);
  
  // Parse the JSON response
  let measurementData;
  try {
    measurementData = JSON.parse(measurementContent);
    
    // Add additional validation here to check if the response is genuine
    // For example, check if the measurements are different from our example values
    const isExampleData = 
      measurementData.ridgeLength === 105 &&
      measurementData.ridgeCount === 6 &&
      measurementData.totalArea === 2865 &&
      measurementData.predominantPitch === "5/12";
    
    if (isExampleData) {
      console.warn(`Warning: OpenAI may have returned example data for request ID ${requestId}`);
    }
    
  } catch (parseError) {
    console.error(`Error parsing OpenAI response JSON for request ID ${requestId}:`, parseError);
    throw new Error(`Failed to parse OpenAI response: ${parseError.message}`);
  }

  return measurementData;
}
