// @deno-types="npm:@types/node"
// @ts-ignore
import { resolvePDFJS } from "https://esm.sh/pdfjs-serverless@0.4.2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

console.log("Starting parse-eagleview-pdf function!");

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  
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
    
    const { fileName, pdfBase64, timestamp, requestId, processingMode, modelType } = requestData;
    
    if (!fileName || !pdfBase64) {
      console.error("Missing required fields in request");
      return new Response(JSON.stringify({ 
        error: "Missing required fields: fileName and pdfBase64 are required" 
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    
    console.log(`Processing PDF: ${fileName}, Request ID: ${requestId || 'none'}, Model: ${modelType || 'gpt-4o-mini'}`);
    console.log(`PDF base64 length: ${pdfBase64.length} characters`);
    
    // Get OpenAI API key from environment variables
    const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiApiKey) {
      console.error("OpenAI API key not found in environment variables");
      throw new Error('OpenAI API key not found in environment variables');
    }
    
    // Convert base64 to binary data
    let pdfBinary;
    try {
      // Remove data URI prefix if present
      const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
      pdfBinary = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      console.log(`Successfully converted base64 to binary. Binary length: ${pdfBinary.length} bytes`);
    } catch (error) {
      console.error('Error decoding base64:', error);
      throw new Error('Invalid PDF format. Expected base64 encoded PDF.');
    }
    
    // Create form data for file upload
    const formData = new FormData();
    const pdfBlob = new Blob([pdfBinary], { type: 'application/pdf' });
    formData.append('file', pdfBlob, fileName);
    formData.append('purpose', 'assistants');
    
    // Upload file to OpenAI
    console.log('Uploading file to OpenAI...');
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
        console.error('File upload error:', errorData);
        throw new Error(`Failed to upload file to OpenAI: ${errorData.error?.message || 'Unknown error'}`);
      }
    } catch (uploadError) {
      console.error('Error during file upload:', uploadError);
      throw new Error(`Error uploading file to OpenAI: ${uploadError.message}`);
    }
    
    const uploadData = await uploadResponse.json();
    const fileId = uploadData.id;
    console.log(`File uploaded successfully. File ID: ${fileId}`);
    
    // Create system prompt
    const systemPrompt = `You are an expert at analyzing EagleView roof measurement reports. Extract all measurements accurately.`;
    
    // Create messages for the OpenAI API using the file ID
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
            type: "file_path",
            file_path: fileId
          }
        ]
      }
    ];
    
    console.log(`Sending request to OpenAI API using model: ${modelType || 'gpt-4o-mini'}`);
    
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
        console.error('OpenAI API error:', errorData);
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
      }
    } catch (apiError) {
      console.error('Error during OpenAI API call:', apiError);
      throw new Error(`Error calling OpenAI API: ${apiError.message}`);
    }
    
    const data = await response.json();
    
    // Extract the measurements from the response
    let measurements;
    try {
      const content = data.choices[0].message.content;
      console.log('Raw OpenAI response:', content);
      
      // Try to extract JSON from the response
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1] || content;
      
      console.log('Extracted JSON string:', jsonStr);
      measurements = JSON.parse(jsonStr.trim());
      console.log('Successfully parsed measurements:', measurements);
    } catch (error) {
      console.error('Error parsing measurements:', error);
      throw new Error('Failed to parse measurements from OpenAI response');
    }
    
    // Clean up - delete the file after use
    try {
      await fetch(`https://api.openai.com/v1/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${openAiApiKey}`
        }
      });
      console.log(`Successfully deleted file ${fileId} from OpenAI`);
    } catch (deleteError) {
      console.error(`Warning: Failed to delete file ${fileId} from OpenAI:`, deleteError);
      // Continue even if deletion fails
    }
    
    // Return the measurements
    console.log('Returning successful response with measurements');
    return new Response(JSON.stringify({ 
      measurements,
      truncated: false
    }), {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Unknown error occurred'
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
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
