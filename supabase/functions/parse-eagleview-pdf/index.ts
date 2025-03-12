// @deno-types="npm:@types/node"
// @ts-ignore
import { resolvePDFJS } from "https://esm.sh/pdfjs-serverless@0.4.2";
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Add Deno global type declaration
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Helper function to safely parse JSON with fallback
function safeJsonParse(jsonString: any) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return null;
  }
}

// Function to extract measurements from text
function extractMeasurementsFromText(text: string) {
  console.log("Extracting measurements from text...");
  
  // Initialize measurements object with default values
  const measurements: any = {
    totalArea: 0,
    predominantPitch: "",
    ridgeLength: 0,
    hipLength: 0,
    valleyLength: 0,
    rakeLength: 0,
    eaveLength: 0,
    ridgeCount: 0,
    hipCount: 0,
    valleyCount: 0,
    rakeCount: 0,
    eaveCount: 0,
    stepFlashingLength: 0,
    stepFlashingCount: 0,
    chimneyCount: 0,
    skylightCount: 0,
    turbineVentCount: 0,
    pipeVentCount: 0,
    penetrationsArea: 0,
    penetrationsPerimeter: 0,
    areasByPitch: {}
  };

  // Extract total area
  const totalAreaMatch = text.match(/Total Area:\s*([\d,]+)\s*sq\s*ft/i) || 
                         text.match(/Total\s*Area\s*=\s*([\d,]+)/i);
  if (totalAreaMatch) {
    measurements.totalArea = parseFloat(totalAreaMatch[1].replace(/,/g, ''));
    console.log("Found total area:", measurements.totalArea);
  }

  // Extract predominant pitch
  const pitchMatch = text.match(/Predominant Pitch:\s*([\d/:.]+)/i) ||
                     text.match(/Primary Pitch:\s*([\d/:.]+)/i);
  if (pitchMatch) {
    measurements.predominantPitch = pitchMatch[1];
    console.log("Found predominant pitch:", measurements.predominantPitch);
  }

  // Extract ridge length
  const ridgeMatch = text.match(/Ridge Length:\s*([\d,]+)\s*ft/i) ||
                     text.match(/Total Ridge:\s*([\d,]+)/i);
  if (ridgeMatch) {
    measurements.ridgeLength = parseFloat(ridgeMatch[1].replace(/,/g, ''));
    console.log("Found ridge length:", measurements.ridgeLength);
  }

  // Extract hip length
  const hipMatch = text.match(/Hip Length:\s*([\d,]+)\s*ft/i) ||
                   text.match(/Total Hip:\s*([\d,]+)/i);
  if (hipMatch) {
    measurements.hipLength = parseFloat(hipMatch[1].replace(/,/g, ''));
    console.log("Found hip length:", measurements.hipLength);
  }

  // Extract valley length
  const valleyMatch = text.match(/Valley Length:\s*([\d,]+)\s*ft/i) ||
                      text.match(/Total Valley:\s*([\d,]+)/i);
  if (valleyMatch) {
    measurements.valleyLength = parseFloat(valleyMatch[1].replace(/,/g, ''));
    console.log("Found valley length:", measurements.valleyLength);
  }

  // Extract rake length
  const rakeMatch = text.match(/Rake Length:\s*([\d,]+)\s*ft/i) ||
                    text.match(/Total Rake:\s*([\d,]+)/i);
  if (rakeMatch) {
    measurements.rakeLength = parseFloat(rakeMatch[1].replace(/,/g, ''));
    console.log("Found rake length:", measurements.rakeLength);
  }

  // Extract eave length
  const eaveMatch = text.match(/Eave Length:\s*([\d,]+)\s*ft/i) ||
                    text.match(/Total Eave:\s*([\d,]+)/i);
  if (eaveMatch) {
    measurements.eaveLength = parseFloat(eaveMatch[1].replace(/,/g, ''));
    console.log("Found eave length:", measurements.eaveLength);
  }

  // Count penetrations
  const skylightMatch = text.match(/Skylight[s]?:?\s*(\d+)/i);
  if (skylightMatch) {
    measurements.skylightCount = parseInt(skylightMatch[1]);
    console.log("Found skylights:", measurements.skylightCount);
  }

  const chimneyMatch = text.match(/Chimney[s]?:?\s*(\d+)/i);
  if (chimneyMatch) {
    measurements.chimneyCount = parseInt(chimneyMatch[1]);
    console.log("Found chimneys:", measurements.chimneyCount);
  }

  const pipeVentMatch = text.match(/Pipe Vent[s]?:?\s*(\d+)/i);
  if (pipeVentMatch) {
    measurements.pipeVentCount = parseInt(pipeVentMatch[1]);
    console.log("Found pipe vents:", measurements.pipeVentCount);
  }

  // Extract areas by pitch
  const pitchAreaMatches = text.matchAll(/(\d+(?:\/\d+)?(?::\d+)?)\s*pitch\s*(?:area|=)\s*([\d,]+)\s*(?:sq\s*ft)?/gi);
  for (const match of pitchAreaMatches) {
    const pitch = match[1];
    const area = parseFloat(match[2].replace(/,/g, ''));
    measurements.areasByPitch[pitch] = area;
    console.log(`Found area for pitch ${pitch}: ${area}`);
  }

  // If we couldn't extract some values, use reasonable defaults based on what we know
  if (measurements.totalArea > 0) {
    // Estimate counts based on total area if not found
    if (measurements.ridgeCount === 0) {
      measurements.ridgeCount = Math.ceil(measurements.totalArea / 1000);
    }
    if (measurements.hipCount === 0 && measurements.hipLength > 0) {
      measurements.hipCount = Math.ceil(measurements.hipLength / 20);
    }
    if (measurements.valleyCount === 0 && measurements.valleyLength > 0) {
      measurements.valleyCount = Math.ceil(measurements.valleyLength / 20);
    }
    if (measurements.rakeCount === 0 && measurements.rakeLength > 0) {
      measurements.rakeCount = Math.ceil(measurements.rakeLength / 25);
    }
    if (measurements.eaveCount === 0 && measurements.eaveLength > 0) {
      measurements.eaveCount = Math.ceil(measurements.eaveLength / 25);
    }
    
    // Estimate penetrations area if not found
    if (measurements.penetrationsArea === 0) {
      const totalPenetrations = measurements.skylightCount + measurements.chimneyCount + measurements.pipeVentCount;
      measurements.penetrationsArea = totalPenetrations * 15; // Rough estimate: 15 sq ft per penetration
      measurements.penetrationsPerimeter = totalPenetrations * 10; // Rough estimate: 10 ft perimeter per penetration
    }
  }

  console.log("Extracted measurements:", measurements);
  return measurements;
}

console.log("Starting parse-eagleview-pdf function with URL-based processing!");

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  
  const startTime = Date.now();
  let requestId = "unknown";
  
  try {
    console.log("Received request to parse-eagleview-pdf function");
    
    // Extract request data
    let requestData;
    try {
      requestData = await req.json();
      console.log("Request data parsed successfully");
    } catch (jsonError) {
      console.error("Error parsing request JSON:", jsonError);
      return new Response(JSON.stringify({ 
        error: "Invalid JSON in request body" 
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    
    const { fileName, pdfUrl, timestamp, requestId: reqId, processingMode, modelType } = requestData;
    requestId = reqId || "no-id";
    
    if (!fileName || !pdfUrl) {
      console.error(`[${requestId}] Missing required fields in request`);
      return new Response(JSON.stringify({ 
        error: "Missing required fields: fileName and pdfUrl are required" 
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    
    console.log(`[${requestId}] Processing PDF: ${fileName}, Model: ${modelType || 'gpt-4o-mini'}, Mode: ${processingMode || 'regular'}`);
    console.log(`[${requestId}] PDF URL: ${pdfUrl}`);
    
    // Get OpenAI API key from environment variables
    const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiApiKey) {
      console.error(`[${requestId}] OpenAI API key not found in environment variables`);
      throw new Error('OpenAI API key not found in environment variables');
    }
    
    // Fetch the PDF from the URL
    console.log(`[${requestId}] Fetching PDF from URL...`);
    let pdfResponse;
    try {
      pdfResponse = await fetch(pdfUrl);
      
      if (!pdfResponse.ok) {
        throw new Error(`Failed to fetch PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
      }
    } catch (fetchError) {
      console.error(`[${requestId}] Error fetching PDF:`, fetchError);
      throw new Error(`Failed to fetch PDF: ${fetchError.message}`);
    }
    
    // Get the PDF binary data
    const pdfBinary = new Uint8Array(await pdfResponse.arrayBuffer());
    console.log(`[${requestId}] Successfully fetched PDF. Binary length: ${pdfBinary.length} bytes`);
    
    // Create form data for file upload to OpenAI
    const formData = new FormData();
    const pdfBlob = new Blob([pdfBinary], { type: 'application/pdf' });
    formData.append('file', pdfBlob, fileName);
    formData.append('purpose', 'assistants');
    
    // Upload file to OpenAI
    console.log(`[${requestId}] Uploading file to OpenAI...`);
    let uploadResponse;
    try {
      uploadResponse = await fetch('https://api.openai.com/v1/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAiApiKey}`
        },
        body: formData
      });
      
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        console.error(`[${requestId}] OpenAI API upload error:`, errorData);
        throw new Error(`OpenAI API upload error: ${errorData.error?.message || 'Unknown error'}`);
      }
    } catch (uploadError) {
      console.error(`[${requestId}] Error uploading file to OpenAI:`, uploadError);
      throw new Error(`Failed to upload file to OpenAI: ${uploadError.message}`);
    }
    
    const uploadData = await uploadResponse.json();
    const fileId = uploadData.id;
    console.log(`[${requestId}] File uploaded to OpenAI. File ID: ${fileId}`);
    
    // Prepare prompt for processing the PDF
    const messages = [
      {
        role: "system",
        content: "You will analyze an EagleView Premium PDF report for a roof and extract the measurements. Your response should be a valid JSON object with measurements from the report. DO NOT include any text outside the JSON."
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `I've uploaded an EagleView PDF report for a roof inspection. Please extract all the measurements including:
1. Total roof area (in sq ft)
2. Predominant pitch
3. All lengths (ridge, hip, valley, rake, eave, step flashing, etc.)
4. Any penetrations (skylights, chimneys, vents)
5. Areas by pitch if available

Return the data as a JSON object with numbers as values (not strings). Do not include any text or explanation outside the JSON object.`
          },
          {
            type: "file_path",
            file_path: fileId
          }
        ]
      }
    ];
    
    console.log(`[${requestId}] Sending request to OpenAI API using model: ${modelType || 'gpt-4o-mini'}`);
    
    // Make API call to OpenAI
    let response;
    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openAiApiKey}`
        },
        body: JSON.stringify({
          model: modelType || 'gpt-4o-mini',
          messages: messages,
          temperature: 0.1,
          max_tokens: 1500
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`[${requestId}] OpenAI API error:`, errorData);
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
      }
    } catch (apiError) {
      console.error(`[${requestId}] Error during OpenAI API call:`, apiError);
      throw new Error(`Error calling OpenAI API: ${apiError.message}`);
    }
    
    const data = await response.json();
    
    // Extract the measurements from the response
    let measurements;
    try {
      const content = data.choices[0].message.content;
      console.log(`[${requestId}] Raw OpenAI response:`, content);
      
      // Try to extract JSON from the response
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1] || content;
      
      console.log(`[${requestId}] Extracted JSON string:`, jsonStr);
      measurements = JSON.parse(jsonStr.trim());
      console.log(`[${requestId}] Successfully parsed measurements:`, measurements);
    } catch (parseError) {
      console.error(`[${requestId}] Error parsing OpenAI response:`, parseError);
      throw new Error(`Error parsing OpenAI response: ${parseError.message}`);
    }
    
    // Clean up the file from OpenAI (in the background)
    fetch(`https://api.openai.com/v1/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${openAiApiKey}`
      }
    }).catch(error => {
      console.warn(`[${requestId}] Error deleting file from OpenAI:`, error);
    });
    
    const processingTime = (Date.now() - startTime) / 1000; // in seconds
    console.log(`[${requestId}] Processing completed in ${processingTime.toFixed(2)} seconds`);
    
    return new Response(
      JSON.stringify({
        measurements,
        success: true,
        processingTime: processingTime,
        fileName: fileName,
        requestId: requestId
      }),
      {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    );
    
  } catch (error) {
    const processingTime = (Date.now() - startTime) / 1000; // in seconds
    console.error(`[${requestId}] Error in parse-eagleview-pdf function:`, error);
    
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
        processingTime: processingTime,
        requestId: requestId
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    );
  }
});

// Function to extract EagleView measurements from the PDF text
function extractEagleViewMeasurements(text: string) {
  const measurements: {
    filename: string | null;
    totalArea: number | null;
    totalSquares: number | null;
    predominantPitch: string | null;
    ridges: number | null;
    valleys: number | null;
    hips: number | null;
    rakes: number | null;
    eaves: number | null;
    flashing: number | null;
    stepFlashing: number | null;
    penetrations: number | null;
    penetrationsPerimeter: number | null;
    wastePercentage: number | null;
    areasPerPitch: Array<{pitch: string; area: number; percentage: number}>;
    lengthMeasurements: any;
    rawText: string;
  } = {
    filename: extractText(text, /Report\s*ID:\s*([A-Z0-9_-]+)/i) || 
              extractText(text, /Order\s*Number:\s*([A-Z0-9_-]+)/i),
    totalArea: extractNumber(text, /Total Area:\s*([\d,.]+)/i) || 
               extractNumber(text, /Total Square Footage:\s*([\d,.]+)/i),
    totalSquares: null,
    predominantPitch: extractText(text, /Predominant Pitch:\s*([^\n\r]+)/i),
    ridges: extractNumber(text, /Ridge Length:\s*([\d,.]+)/i),
    valleys: extractNumber(text, /Valley Length:\s*([\d,.]+)/i),
    hips: extractNumber(text, /Hip Length:\s*([\d,.]+)/i),
    rakes: extractNumber(text, /Rake Length:\s*([\d,.]+)/i),
    eaves: extractNumber(text, /Eave Length:\s*([\d,.]+)/i),
    flashing: extractNumber(text, /Flashing Length:\s*([\d,.]+)/i),
    stepFlashing: extractNumber(text, /Step Flashing Length:\s*([\d,.]+)/i),
    penetrations: extractNumber(text, /Penetrations Area:\s*([\d,.]+)/i),
    penetrationsPerimeter: extractNumber(text, /Penetrations Perimeter:\s*([\d,.]+)/i),
    wastePercentage: extractNumber(text, /Waste Percentage:\s*([\d,.]+)/i) || 
                     calculateWastePercentage(text),
    areasPerPitch: extractAreasPerPitch(text),
    lengthMeasurements: extractLengthMeasurements(text),
    rawText: text,
  };

  // Calculate total squares if total area is available (1 square = 100 sq ft)
  if (measurements.totalArea) {
    measurements.totalSquares = Math.ceil(measurements.totalArea / 100);
  }

  return measurements;
}

// Helper function to extract numbers from text using regex
function extractNumber(text: string, regex: RegExp): number | null {
  const match = text.match(regex);
  if (match && match[1]) {
    // Remove commas and convert to number
    return parseFloat(match[1].replace(/,/g, ''));
  }
  return null;
}

// Helper function to extract text using regex
function extractText(text: string, regex: RegExp): string | null {
  const match = text.match(regex);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
}

// Helper function to extract areas per pitch
function extractAreasPerPitch(text: string): Array<{pitch: string; area: number; percentage: number}> {
  const pitchAreas: Array<{pitch: string; area: number; percentage: number}> = [];
  const pitchRegex = /(\d+\/\d+)\s*pitch\s*[\-:]\s*([\d,.]+)\s*(?:sq\.?\s*ft\.?|square\s*feet)\s*\(?\s*([\d.]+)%\s*\)?/gi;
  
  let match;
  while ((match = pitchRegex.exec(text)) !== null) {
    pitchAreas.push({
      pitch: match[1],
      area: parseFloat(match[2].replace(/,/g, '')),
      percentage: parseFloat(match[3])
    });
  }
  
  return pitchAreas;
}

// Helper function to extract length measurements
function extractLengthMeasurements(text: string): any {
  return {
    ridgeCount: extractNumber(text, /Ridge Count:\s*([\d,.]+)/i),
    hipCount: extractNumber(text, /Hip Count:\s*([\d,.]+)/i),
    valleyCount: extractNumber(text, /Valley Count:\s*([\d,.]+)/i),
    rakeCount: extractNumber(text, /Rake Count:\s*([\d,.]+)/i),
    eaveCount: extractNumber(text, /Eave Count:\s*([\d,.]+)/i),
    stepFlashingCount: extractNumber(text, /Step Flashing Count:\s*([\d,.]+)/i),
    chimneyCount: extractNumber(text, /Chimney Count:\s*([\d,.]+)/i),
    skylightCount: extractNumber(text, /Skylight Count:\s*([\d,.]+)/i),
    turbineVentCount: extractNumber(text, /Turbine Vent Count:\s*([\d,.]+)/i),
    pipeVentCount: extractNumber(text, /Pipe Vent Count:\s*([\d,.]+)/i)
  };
}

// Helper function to calculate waste percentage based on roof complexity
function calculateWastePercentage(text: string): number | null {
  // If we can't find explicit waste percentage, calculate based on roof complexity
  const totalArea = extractNumber(text, /Total Area:\s*([\d,.]+)/i) || 
                    extractNumber(text, /Total Square Footage:\s*([\d,.]+)/i);
  const valleyLength = extractNumber(text, /Valley Length:\s*([\d,.]+)/i) || 0;
  const hipLength = extractNumber(text, /Hip Length:\s*([\d,.]+)/i) || 0;
  
  if (totalArea) {
    // Calculate complexity factor based on valley and hip lengths per square
    const complexityFactor = ((valleyLength + hipLength) / totalArea) * 100;
    
    // Assign waste percentage based on complexity
    if (complexityFactor > 15) {
      return 20; // Very complex roof
    } else if (complexityFactor > 10) {
      return 17; // Complex roof
    } else if (complexityFactor > 5) {
      return 15; // Moderately complex roof
    } else if (complexityFactor > 2) {
      return 12; // Somewhat complex roof
    } else {
      return 10; // Simple roof
    }
  }
  
  return null;
}
