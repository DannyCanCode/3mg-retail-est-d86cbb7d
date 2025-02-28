
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Models and processing modes
type ModelType = "gpt-4o" | "gpt-4o-mini";
type ProcessingMode = "regular" | "fallback";

// OpenAI API key
const openAiApiKey = Deno.env.get('OPENAI_API_KEY');

// Helper function to check if base64 string is valid PDF
function isValidPdfBase64(base64String: string): boolean {
  // Basic validation to check if it starts with PDF header in base64
  // %PDF- in base64 usually begins with "JVBERi0"
  return base64String && base64String.startsWith('JVBERi0');
}

// Helper to create a system prompt based on the processing mode
function createSystemPrompt(processingMode: ProcessingMode): string {
  const basePrompt = `You are an expert in analyzing EagleView PDF roof measurement reports. 
  Extract all measurements including total area, pitch, length measurements for ridge, hip, valley, rake, eave, 
  step flashing, wall flashing, and counts for penetrations.`;
  
  if (processingMode === "fallback") {
    return `${basePrompt} 
    The PDF file is large, so focus ONLY on pages 9-10 where the key measurements are typically located. 
    Extract ONLY measurement data - do not analyze any other content.`;
  }
  
  return basePrompt;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileName, pdfBase64, timestamp, requestId, processingMode = "regular", modelType = "gpt-4o-mini" } = await req.json();
    
    // Validate inputs
    if (!fileName) {
      console.error("Missing fileName parameter");
      return new Response(
        JSON.stringify({ error: "Missing fileName parameter" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!pdfBase64) {
      console.error("Missing pdfBase64 parameter");
      return new Response(
        JSON.stringify({ error: "Missing PDF content" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Basic PDF validation
    if (!isValidPdfBase64(pdfBase64)) {
      console.error("Invalid PDF format: Not a valid base64-encoded PDF");
      return new Response(
        JSON.stringify({ error: "Invalid PDF format. Expected base64 encoded PDF." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Processing file ${fileName} (RequestID: ${requestId || 'none'}, Mode: ${processingMode}, Model: ${modelType})`);
    
    // Create a data URI for the PDF
    const dataUri = `data:application/pdf;base64,${pdfBase64}`;
    
    // Create system prompt based on processing mode
    const systemPrompt = createSystemPrompt(processingMode);
    
    // Create messages for the OpenAI API
    const messages = [
      { role: "system", content: systemPrompt },
      { 
        role: "user", 
        content: [
          { 
            type: "text", 
            text: "Please extract the measurement data from this EagleView PDF roof report. Return the data in valid JSON format with the following structure: { \"totalArea\": number, \"predominantPitch\": string, \"ridgeLength\": number, \"hipLength\": number, \"valleyLength\": number, \"rakeLength\": number, \"eaveLength\": number, \"ridgeCount\": number, \"hipCount\": number, \"valleyCount\": number, \"rakeCount\": number, \"eaveCount\": number, \"stepFlashingLength\": number, \"stepFlashingCount\": number, \"chimneyCount\": number, \"skylightCount\": number, \"turbineVentCount\": number, \"pipeVentCount\": number, \"penetrationsArea\": number, \"penetrationsPerimeter\": number }. All length measurements should be in feet, areas in square feet."
          },
          {
            type: "file_url",
            file_url: {
              url: dataUri
            }
          }
        ]
      }
    ];
    
    console.log(`Sending request to OpenAI API using model: ${modelType}`);
    
    // Make API call to OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAiApiKey}`
      },
      body: JSON.stringify({
        model: modelType,
        messages: messages,
        temperature: 0.1, // Lower temperature for more deterministic output
        max_tokens: 1500  // Limit to ensure we get a reasonable response size
      })
    });
    
    if (!response.ok) {
      const errorResponse = await response.json();
      console.error("OpenAI API error:", JSON.stringify(errorResponse));
      
      // Check for token/context length errors
      if (errorResponse.error && (
        errorResponse.error.message.includes("maximum context length") ||
        errorResponse.error.message.includes("token limit")
      )) {
        return new Response(
          JSON.stringify({ 
            error: "The PDF file is too large or complex for processing. Please try a smaller file or one with fewer pages." 
          }),
          { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `OpenAI API error: ${errorResponse.error?.message || "Unknown error"}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const data = await response.json();
    console.log("OpenAI response received successfully");
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error("Invalid response format from OpenAI");
      return new Response(
        JSON.stringify({ error: "Invalid response from AI service" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Extract the content from the response
    const content = data.choices[0].message.content;
    console.log("AI response content:", content);
    
    // Extract just the JSON part
    let jsonMatch;
    try {
      // Try to find JSON content - either full content is JSON or extract JSON between backticks or curly braces
      if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
        jsonMatch = content.trim();
      } else {
        // Look for JSON between ```json and ``` markers (common in markdown responses)
        const jsonBlockRegex = /```(?:json)?\s*({[\s\S]*?})\s*```/;
        const jsonBlockMatch = content.match(jsonBlockRegex);
        
        if (jsonBlockMatch && jsonBlockMatch[1]) {
          jsonMatch = jsonBlockMatch[1];
        } else {
          // Try to extract anything between curly braces as a last resort
          const curlyBraceRegex = /{[\s\S]*?}/;
          const curlyBraceMatch = content.match(curlyBraceRegex);
          
          if (curlyBraceMatch) {
            jsonMatch = curlyBraceMatch[0];
          }
        }
      }
      
      if (!jsonMatch) {
        throw new Error("Could not extract JSON data from the AI response");
      }
      
      // Parse the JSON to ensure it's valid
      const measurements = JSON.parse(jsonMatch);
      
      // Basic validation of the measurements object
      if (typeof measurements !== 'object' || measurements === null) {
        throw new Error("Parsed JSON is not a valid object");
      }
      
      // Check if truncation happened (often indicated in OpenAI responses)
      const wasTruncated = content.includes("truncated") || 
                            data.choices[0].finish_reason === "length" ||
                            Object.keys(measurements).length < 5; // Heuristic: too few properties = likely truncated
      
      // Return the measurements
      return new Response(
        JSON.stringify({
          measurements,
          truncated: wasTruncated
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } catch (jsonError) {
      console.error("Error parsing JSON from AI response:", jsonError);
      console.error("Original content:", content);
      
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse measurement data from the PDF. The AI could not extract valid data." 
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
  } catch (error) {
    console.error("Error processing request:", error);
    
    return new Response(
      JSON.stringify({ error: `Error processing request: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
