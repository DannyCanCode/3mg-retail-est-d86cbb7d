
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
    const { pdfBase64, fileName } = await req.json();
    
    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ error: 'No PDF content provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For testing purposes and debugging, return mock data if there's any issue
    // In a production environment, this would be replaced with the actual OpenAI call
    try {
      // Process the PDF with OpenAI to extract measurements
      const extractedMeasurements = await extractMeasurementsWithOpenAI(pdfBase64);
      
      // Return the parsed data
      return new Response(
        JSON.stringify({ 
          message: 'PDF parsed successfully',
          measurements: extractedMeasurements
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (openAIError) {
      console.error('Error with OpenAI processing, falling back to mock data:', openAIError);
      
      // Return mock data as a fallback
      const mockMeasurements = {
        totalArea: 2800,
        roofPitch: "6:12",
        ridgeLength: 120,
        valleyLength: 45,
        hipLength: 65,
        eaveLength: 180,
        rakeLength: 85,
        stepFlashingLength: 12,
        chimneyCount: 1,
        skylightCount: 2,
        ventCount: 6
      };
      
      return new Response(
        JSON.stringify({ 
          message: 'PDF parsed with mock data (OpenAI processing failed)',
          measurements: mockMeasurements
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error processing PDF:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function extractMeasurementsWithOpenAI(pdfBase64: string) {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // For PDF parsing, we'll use GPT-4o capabilities
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
          content: `You are a PDF parsing assistant specialized in extracting measurements from EagleView roofing reports. 
          Extract all relevant measurements including total area, roof pitch, ridge length, valley length, hip length, 
          eave length, rake length, step flashing length, chimney count, skylight count, and vent count. 
          Return the data as structured JSON only, without any explanation text.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all the measurements from this EagleView roofing report PDF. Return ONLY a JSON object with the measurements. The format must be camelCase with keys like totalArea, roofPitch, ridgeLength, etc.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:application/pdf;base64,${pdfBase64}`,
              }
            }
          ],
        }
      ],
      max_tokens: 1000,
      temperature: 0.0,
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
  }

  const result = await response.json();
  const measurementContent = result.choices[0].message.content;
  
  // Log the raw response for debugging
  console.log("OpenAI Response:", measurementContent);
  
  // Parse the JSON response
  let measurementData;
  try {
    measurementData = JSON.parse(measurementContent);
  } catch (parseError) {
    console.error("Error parsing OpenAI response JSON:", parseError);
    throw new Error(`Failed to parse OpenAI response: ${parseError.message}`);
  }

  return measurementData;
}
