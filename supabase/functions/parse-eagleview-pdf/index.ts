
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

// Max characters to include from PDF (100KB is much safer)
const MAX_PDF_CHARS = 100000;
// Model to use
const AI_MODEL = "gpt-4o-mini";  // Using the faster and more efficient mini model

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Request received for PDF parsing");
  
  try {
    const { fileName, pdfBase64, requestId, processingMode = "regular" } = await req.json();
    console.log(`Processing ${fileName} (Request ID: ${requestId}), mode: ${processingMode}`);
    
    if (!pdfBase64) {
      throw new Error("No PDF data provided");
    }
    
    // Check if it's base64 encoded
    if (!pdfBase64.startsWith('data:application/pdf;base64,')) {
      throw new Error("Invalid PDF format. Expected base64 encoded PDF.");
    }
    
    // Log original file size for debugging
    const originalLength = pdfBase64.length;
    console.log(`File size (base64 length): ${originalLength} chars`);
    
    // Start PDF processing
    console.log(`Starting PDF processing (request ID: ${requestId})`);
    
    // Handle very large files - truncate if needed
    let truncated = false;
    let pdfContent = pdfBase64;
    
    if (pdfBase64.length > MAX_PDF_CHARS * 2) { // *2 because base64 is ~33% larger than raw binary
      console.warn(`PDF is very large (${pdfBase64.length} chars). Truncating to ${MAX_PDF_CHARS} chars.`);
      pdfContent = pdfBase64.substring(0, MAX_PDF_CHARS * 2);
      truncated = true;
    }
    
    try {
      console.log(`Processing file: ${fileName} at timestamp ${Date.now()}`);
      
      // Extract measurements from PDF with OpenAI
      let measurements;
      if (processingMode === "fallback") {
        console.log("Using fallback processing mode (optimized for large files)");
        measurements = await extractMeasurementsWithStructuredPrompt(pdfContent);
      } else {
        console.log("Using regular processing mode");
        measurements = await extractMeasurementsWithOpenAI(pdfContent);
      }
      
      console.log(`Successfully extracted measurements for ${fileName}`);
      
      return new Response(
        JSON.stringify({
          measurements,
          truncated,
          fileName
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error(`Error with OpenAI processing: ${error}`);
      throw error;
    }
  } catch (error) {
    console.error(`Error processing request: ${error}`);
    
    return new Response(
      JSON.stringify({
        error: error.message || "Unknown error occurred",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

async function extractMeasurementsWithOpenAI(pdfBase64: string) {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured");
  }

  // Generate a PDF Base64 preview (first 200 chars)
  const pdfPreview = pdfBase64.substring(0, 200) + "...";
  console.log("PDF base64 preview:", pdfPreview);

  try {
    // Create a stripped version of the PDF content to reduce tokens
    const contentForProcessing = stripPdfContent(pdfBase64);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are a specialized AI for extracting roofing measurements from EagleView PDF reports. 
                     Extract all measurements into a valid JSON object with the following fields:
                     - ridgeLength (number, in feet)
                     - ridgeCount (number)
                     - hipLength (number, in feet)
                     - hipCount (number)
                     - valleyLength (number, in feet)
                     - valleyCount (number)
                     - rakeLength (number, in feet)
                     - rakeCount (number)
                     - eaveLength (number, in feet)
                     - eaveCount (number)
                     - dripEdgeLength (number, in feet)
                     - parapetWallLength (number, in feet)
                     - parapetWallCount (number)
                     - flashingLength (number, in feet)
                     - flashingCount (number)
                     - stepFlashingLength (number, in feet)
                     - stepFlashingCount (number)
                     - penetrationsArea (number, in sq ft)
                     - totalArea (number, in sq ft)
                     - penetrationsPerimeter (number, in feet)
                     - predominantPitch (string, e.g. "5/12")
                     
                     Return ONLY the JSON object, no explanations, comments or any other text. 
                     If you cannot extract a value, set it to 0 for numbers or "N/A" for strings.
                     DO NOT generate example data or placeholder values.`
          },
          {
            role: 'user',
            content: `Extract all roof measurements from this EagleView PDF base64 content. 
                     IMPORTANT: Return ONLY the JSON object with the exact structure described.
                     Base64 PDF content: ${contentForProcessing}`
          }
        ],
        temperature: 0.1, // Low temperature for more consistent results
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", errorData);
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const responseContent = data.choices[0].message.content.trim();
    
    // Log a preview of the response
    console.log("OpenAI Response preview:", responseContent.substring(0, 100) + "...");
    
    try {
      // Try to extract JSON from the response
      // First, find JSON-like content by looking for opening and closing braces
      let jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error("No JSON object found in the response");
      }
      
      const jsonString = jsonMatch[0];
      const parsedMeasurements = JSON.parse(jsonString);
      
      // Validate the structure to ensure we have the expected fields
      validateMeasurements(parsedMeasurements);
      
      return parsedMeasurements;
    } catch (parseError) {
      console.error("Error parsing OpenAI response as JSON:", parseError);
      console.log("Full response:", responseContent);
      throw new Error("Could not parse AI response as valid JSON");
    }
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    throw error;
  }
}

async function extractMeasurementsWithStructuredPrompt(pdfBase64: string) {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured");
  }

  try {
    // For structured prompt, we don't send the PDF content directly
    // Instead, we ask specific questions about the measurements
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are a specialized AI for extracting roofing measurements from PDF files that are too large to process directly.
                     I'll ask you to analyze specific patterns in the PDF that match common formats of EagleView measurement reports.
                     Your task is to identify and extract numbers that match specific measurement patterns.`
          },
          {
            role: 'user',
            content: `I have an EagleView PDF report that's too large to send in full. I need you to extract common measurement patterns.
                     Here's a highly truncated and partial sample of the PDF as base64 (first 30KB):
                     ${pdfBase64.substring(0, 30000)}
                     
                     Based on this partial sample, please:
                     1. Look for patterns where "Total Roof Area" or similar text appears near a number (often followed by "sq ft")
                     2. Look for roof pitch information (like "4/12", "5/12", etc.)
                     3. Look for any measurements related to ridges, hips, valleys, rakes, eaves, etc.
                     4. Count instances of these features when possible
                     
                     Return ONLY a JSON object with these fields (use 0 for numbers or "N/A" for strings if not found):
                     {
                       "ridgeLength": 0,
                       "ridgeCount": 0,
                       "hipLength": 0,
                       "hipCount": 0,
                       "valleyLength": 0,
                       "valleyCount": 0,
                       "rakeLength": 0,
                       "rakeCount": 0,
                       "eaveLength": 0,
                       "eaveCount": 0,
                       "dripEdgeLength": 0,
                       "parapetWallLength": 0,
                       "parapetWallCount": 0,
                       "flashingLength": 0,
                       "flashingCount": 0,
                       "stepFlashingLength": 0,
                       "stepFlashingCount": 0,
                       "penetrationsArea": 0,
                       "totalArea": 0,
                       "penetrationsPerimeter": 0,
                       "predominantPitch": "N/A"
                     }`
          }
        ],
        temperature: 0.2,
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error in fallback mode:", errorData);
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const responseContent = data.choices[0].message.content.trim();
    
    try {
      // Extract JSON from the response
      let jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error("No JSON object found in the fallback response");
      }
      
      const jsonString = jsonMatch[0];
      const parsedMeasurements = JSON.parse(jsonString);
      
      // Validate the structure
      validateMeasurements(parsedMeasurements);
      
      return parsedMeasurements;
    } catch (parseError) {
      console.error("Error parsing fallback OpenAI response as JSON:", parseError);
      console.log("Full fallback response:", responseContent);
      throw new Error("Could not parse AI fallback response as valid JSON");
    }
  } catch (error) {
    console.error("Error in fallback processing mode:", error);
    throw error;
  }
}

// Helper function to strip PDF content to essential parts to reduce token usage
function stripPdfContent(pdfBase64: string): string {
  // Take a limited portion of the PDF (first MAX_PDF_CHARS chars)
  const contentToProcess = pdfBase64.length > MAX_PDF_CHARS 
    ? pdfBase64.substring(0, MAX_PDF_CHARS) 
    : pdfBase64;
  
  console.log(`PDF content truncated from ${pdfBase64.length} to ${contentToProcess.length} chars`);
  
  return contentToProcess;
}

// Helper function to validate the measurements object
function validateMeasurements(measurements: any): void {
  const requiredFields = [
    'ridgeLength', 'ridgeCount', 'hipLength', 'hipCount',
    'valleyLength', 'valleyCount', 'rakeLength', 'rakeCount',
    'eaveLength', 'eaveCount', 'dripEdgeLength',
    'parapetWallLength', 'parapetWallCount',
    'flashingLength', 'flashingCount',
    'stepFlashingLength', 'stepFlashingCount',
    'penetrationsArea', 'totalArea', 'penetrationsPerimeter',
    'predominantPitch'
  ];
  
  for (const field of requiredFields) {
    if (measurements[field] === undefined) {
      console.warn(`Missing field in measurements: ${field}`);
      
      // Add the missing field with a default value
      if (field === 'predominantPitch') {
        measurements[field] = 'N/A';
      } else {
        measurements[field] = 0;
      }
    }
  }
  
  // Verify the measurements are not an example/placeholder set
  // Check if all number values are 0 or close to 0
  const numericFieldCount = requiredFields.filter(field => field !== 'predominantPitch').length;
  const zeroValueCount = Object.entries(measurements)
    .filter(([key, value]) => key !== 'predominantPitch' && (value === 0 || value === '0'))
    .length;
  
  // If over 90% of numeric values are 0, we likely have example data
  if (zeroValueCount > numericFieldCount * 0.9) {
    console.warn("Possible example/placeholder data detected (too many zero values)");
    // We don't throw here, just log a warning, as sometimes PDFs might genuinely have 0 values
  }
}
