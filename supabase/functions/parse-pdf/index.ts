import { resolvePDFJS } from "https://esm.sh/pdfjs-serverless@0.4.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

console.log("Starting parse-pdf function!");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log("Checking method...");
  if (req.method === "POST") {
    try {
      const { pdfUrl } = await req.json();
      console.log("Processing PDF:", pdfUrl);
      
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch the PDF. Status: ${response.status} ${response.statusText}`,
        );
      }
      
      const data = new Uint8Array(await response.arrayBuffer());
      console.log("Fetched PDF successfully! Processing...");
      
      const { getDocument } = await resolvePDFJS();
      const doc = await getDocument({ data, useSystemFonts: true }).promise;
      const allText = [];
      
      console.log("Processing PDF pages...");
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        const contents = textContent.items.map((item) => item.str).join(" ");
        allText.push(contents);
      }
      
      const combinedText = allText.join("\n");
      console.log("Processed PDF successfully!");

      // Extract key measurements from the PDF text
      const measurements = extractMeasurements(combinedText);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          pdfText: combinedText,
          measurements: measurements 
        }), 
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      console.error("Error processing PDF:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  }
  
  return new Response(
    JSON.stringify({ success: false, error: "Invalid request method" }),
    {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});

// Function to extract measurements from the PDF text
function extractMeasurements(text: string) {
  const measurements = {
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
    areasPerPitch: extractAreasPerPitch(text),
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
function extractAreasPerPitch(text: string): any[] {
  const pitchAreas = [];
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