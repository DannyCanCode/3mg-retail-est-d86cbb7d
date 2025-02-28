
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Create a Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store the PDF file in Supabase Storage (optional)
    /*
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('eagleview-pdfs')
      .upload(`${Date.now()}-${fileName}`, decode(pdfBase64), {
        contentType: 'application/pdf',
      });

    if (storageError) {
      console.error('Error storing PDF:', storageError);
      // Continue anyway, as we can still try to parse without storing
    }
    */

    // Process the PDF with OpenAI
    const extractedMeasurements = await extractMeasurementsWithOpenAI(pdfBase64);

    // Return the parsed data
    return new Response(
      JSON.stringify({ 
        message: 'PDF parsed successfully',
        measurements: extractedMeasurements
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
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

  try {
    // For PDF parsing, we'll use GPT-4 Vision capabilities
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
                text: 'Extract all the measurements from this EagleView roofing report PDF. Return ONLY a JSON object with the measurements.'
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
    const measurementData = JSON.parse(result.choices[0].message.content);

    return measurementData;
  } catch (error) {
    console.error('Error in OpenAI processing:', error);
    throw new Error(`Failed to extract measurements: ${error.message}`);
  }
}
