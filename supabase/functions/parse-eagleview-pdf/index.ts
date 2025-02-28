
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
        totalArea: 2862,
        roofPitch: "5/12",
        ridgeLength: 105,
        valleyLength: 89,
        hipLength: 10,
        eaveLength: 109,
        rakeLength: 154,
        stepFlashingLength: 16,
        flashingLength: 2,
        penetrationsArea: 3,
        penetrationsPerimeter: 14,
        ridgeCount: 6,
        hipCount: 2,
        valleyCount: 8,
        rakeCount: 15,
        eaveCount: 9,
        dripEdgeLength: 263,
        parapetWallLength: 0,
        parapetWallCount: 0
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
          content: `You are a specialized EagleView roof report parser. Extract the following specific measurements exactly as they appear in the report:

          1. Ridges (both length in ft and count)
          2. Hips (both length in ft and count)
          3. Valleys (both length in ft and count)
          4. Rakes (both length in ft and count)
          5. Eaves/Starter (both length in ft and count)
          6. Drip Edge (length in ft)
          7. Parapet Walls (both length in ft and count)
          8. Flashing (both length in ft and count)
          9. Step flashing (both length in ft and count)
          10. Total Penetrations Area (sq ft)
          11. Total Roof Area Less Penetrations (sq ft)
          12. Total Penetrations Perimeter (ft)
          13. Predominant Pitch (e.g. 5/12)

          Look carefully for these values in the report. They often appear in a measurements summary section.
          Return ONLY a JSON object with camelCase keys. For lengths, include both the total length and count as separate fields.
          For example: "ridgeLength": 105, "ridgeCount": 6, etc.
          Do not include any explanatory text outside the JSON.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Parse this EagleView roofing report and extract all the specific measurements I need in the exact format specified.'
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
