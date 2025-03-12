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

console.log("Starting parse-eagleview-pdf function with PDF.js processing!");

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
    
    const { fileName, pdfUrl, timestamp, requestId: reqId, processingMode } = requestData;
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
    
    console.log(`[${requestId}] Processing PDF: ${fileName}, Mode: ${processingMode || 'regular'}`);
    console.log(`[${requestId}] PDF URL: ${pdfUrl}`);
    
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
    const pdfBuffer = await pdfResponse.arrayBuffer();
    console.log(`[${requestId}] Successfully fetched PDF. Binary length: ${pdfBuffer.byteLength} bytes`);
    
    // Use pdfjs-serverless to extract text from the PDF
    console.log(`[${requestId}] Using PDF.js to extract text...`);
    const pdfjsLib = await resolvePDFJS();
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
    const pdfDocument = await loadingTask.promise;
    
    console.log(`[${requestId}] PDF document loaded. Number of pages: ${pdfDocument.numPages}`);
    
    // Extract text from all pages
    let extractedText = '';
    const maxPages = Math.min(pdfDocument.numPages, 20); // Limit to first 20 pages to avoid processing huge PDFs
    
    for (let pageNumber = 1; pageNumber <= maxPages; pageNumber++) {
      console.log(`[${requestId}] Processing page ${pageNumber}...`);
      const page = await pdfDocument.getPage(pageNumber);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      extractedText += pageText + '\n';
    }
    
    console.log(`[${requestId}] Text extraction complete. Extracted ${extractedText.length} characters.`);
    
    // Extract measurements from the text
    console.log(`[${requestId}] Extracting measurements...`);
    const measurements = extractMeasurementsFromText(extractedText);
    
    const processingTime = (Date.now() - startTime) / 1000; // in seconds
    console.log(`[${requestId}] Processing completed in ${processingTime.toFixed(2)} seconds`);
    
    return new Response(
      JSON.stringify({
        measurements,
        success: true,
        processingTime: processingTime,
        fileName: fileName,
        requestId: requestId,
        extractedText: extractedText.length > 1000 ? extractedText.substring(0, 1000) + '...' : extractedText
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
