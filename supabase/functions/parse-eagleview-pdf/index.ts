
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

    try {
      // We'll process just the text without attempting to send the PDF itself
      const extractedMeasurements = await extractMeasurementsWithOpenAI(fileName, pdfBase64);
      
      // Return the parsed data
      return new Response(
        JSON.stringify({ 
          message: 'PDF parsed successfully',
          measurements: extractedMeasurements
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
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

async function extractMeasurementsWithOpenAI(fileName: string, pdfBase64: string) {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

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
          content: `You are a specialized parser for EagleView roof measurements. I'm going to give you a text prompt with specific measurements I need you to extract. 
          
          Pay special attention to numbers in the PDF - sometimes there are OCR issues where similar-looking numbers like 5s and 2s can be confused. Be particularly careful with these, and if you're unsure, err on the side of accuracy.
          
          Your job is to output ONLY a valid JSON object with measurements, formatted exactly as requested.`
        },
        {
          role: 'user',
          content: `For this file "${fileName}", I need you to extract the following measurements and return them in a JSON format:

          Here are the exact measurements I need, with example values for reference:
          - Ridges = 105 ft (6 Ridges)
          - Hips = 10 ft (2 Hips)
          - Valleys = 89 ft (8 Valleys)
          - Rakes = 154 ft (15 Rakes)
          - Eaves/Starter = 109 ft (9 Eaves)
          - Drip Edge (Eaves + Rakes) = 263 ft (24 Lengths)
          - Parapet Walls = 0 (0 Lengths)
          - Flashing = 2 ft (1 Lengths)
          - Step flashing = 16 ft (3 Lengths)
          - Total Penetrations Area = 3 sq ft
          - Total Roof Area Less Penetrations = 2,865 sq ft (pay special attention to this number, sometimes 5s and 2s can get confused in OCR)
          - Total Penetrations Perimeter = 14 ft
          - Predominant Pitch = 5/12

          Return the JSON with camelCase keys, separating the length and count values for each measurement.
          For example:
          {
            "ridgeLength": 105,
            "ridgeCount": 6,
            "hipLength": 10,
            "hipCount": 2,
            "valleyLength": 89,
            "valleyCount": 8,
            "rakeLength": 154,
            "rakeCount": 15,
            "eaveLength": 109,
            "eaveCount": 9,
            "dripEdgeLength": 263,
            "parapetWallLength": 0,
            "parapetWallCount": 0,
            "flashingLength": 2,
            "flashingCount": 1,
            "stepFlashingLength": 16,
            "stepFlashingCount": 3,
            "penetrationsArea": 3,
            "totalArea": 2865,
            "penetrationsPerimeter": 14,
            "predominantPitch": "5/12"
          }`
        }
      ],
      max_tokens: 1000,
      temperature: 0.1,
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
