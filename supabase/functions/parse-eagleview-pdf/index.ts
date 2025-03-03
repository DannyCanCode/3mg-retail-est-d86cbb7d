import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Function to generate simulated measurements
function generateSimulatedMeasurements() {
  return {
    totalArea: 2500,
    predominantPitch: "5:12",
    ridgeLength: 120,
    hipLength: 80,
    valleyLength: 60,
    rakeLength: 100,
    eaveLength: 140,
    ridgeCount: 3,
    hipCount: 4,
    valleyCount: 2,
    rakeCount: 4,
    eaveCount: 5,
    stepFlashingLength: 50,
    stepFlashingCount: 10,
    chimneyCount: 1,
    skylightCount: 2,
    turbineVentCount: 1,
    pipeVentCount: 4,
    penetrationsArea: 150,
    penetrationsPerimeter: 100
  };
}

// Helper function to safely parse JSON with fallback
function safeJsonParse(jsonString: string) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error parsing JSON:", error);
    console.log("Attempting to clean and parse JSON...");
    
    try {
      // Try to clean the JSON string by removing any non-JSON characters
      const cleanedJson = jsonString
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .replace(/^\s*[\r\n]/gm, '')
        .trim();
      
      return JSON.parse(cleanedJson);
    } catch (secondError) {
      console.error("Failed to parse cleaned JSON:", secondError);
      throw new Error(`Failed to parse JSON: ${error.message}`);
    }
  }
}

// Helper function to extract JSON from text
function extractJsonFromText(text: string): string {
  console.log("Attempting to extract JSON from text:", text.substring(0, 100) + "...");
  
  try {
    // First, try to extract JSON from markdown code blocks
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
    const codeBlockMatch = text.match(codeBlockRegex);
    
    if (codeBlockMatch && codeBlockMatch[1]) {
      console.log("Found JSON in code block");
      return codeBlockMatch[1].trim();
    }
    
    // If no code block, try to find JSON between curly braces
    const curlyBraceRegex = /\{[\s\S]*\}/;
    const curlyBraceMatch = text.match(curlyBraceRegex);
    
    if (curlyBraceMatch) {
      console.log("Found JSON between curly braces");
      return curlyBraceMatch[0].trim();
    }
    
    // If still no match, return the original text
    console.log("No JSON pattern found, returning original text");
    return text.trim();
  } catch (error) {
    console.error("Error in extractJsonFromText:", error);
    return text.trim();
  }
}

// Main function to process images from EagleView PDF pages
async function processEagleViewImages(imageBase64Array: string[], modelType: string = "gpt-4o") {
  console.log(`Processing ${imageBase64Array.length} EagleView report images with ${modelType}...`);
  
  try {
    // Get OpenAI API key
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable not set");
    }
    
    // Construct the system prompt
    const systemPrompt = `You are an expert at analyzing EagleView roof measurement reports. 
    Extract the following measurements from the images of the report pages:
    - Total Area (in square feet)
    - Predominant Pitch (e.g., "5:12")
    - Ridge Length (in feet)
    - Hip Length (in feet)
    - Valley Length (in feet)
    - Rake Length (in feet)
    - Eave Length (in feet)
    - Ridge Count
    - Hip Count
    - Valley Count
    - Rake Count
    - Eave Count
    - Step Flashing Length (in feet)
    - Step Flashing Count
    - Chimney Count
    - Skylight Count
    - Turbine Vent Count
    - Pipe Vent Count
    - Penetrations Area (in square feet)
    - Penetrations Perimeter (in feet)
    
    The images are from pages 1, 9, and 10 of an EagleView report, which typically contain the key measurements.
    Return a JSON object with these measurements using camelCase property names (e.g., totalArea, predominantPitch, etc.).
    If a measurement is not found in the images, leave it out of the response.`;
    
    // Prepare the content array with text and images
    const messageContent: any[] = [
      {
        type: "text",
        text: "Please analyze these EagleView roof measurement report pages and extract all the measurements listed in your instructions. Return the results as a JSON object with camelCase property names."
      }
    ];
    
    // Add each image to the content array
    for (let i = 0; i < imageBase64Array.length; i++) {
      messageContent.push({
        type: "image_url",
        image_url: {
          url: `data:image/png;base64,${imageBase64Array[i]}`
        }
      });
    }
    
    // Construct the API request
    const apiRequest = {
      model: modelType,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: messageContent
        }
      ],
      max_tokens: 1000
    };
    
    // Call the OpenAI API
    console.log("Calling OpenAI API...");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(apiRequest)
    });
    
    // Check if the response is OK
    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", errorData);
      
      // If we get an error, return simulated measurements
      console.log("Returning simulated measurements due to API error");
      return {
        measurements: generateSimulatedMeasurements(),
        success: false,
        note: "These are simulated measurements. The actual image analysis failed.",
        error: errorData.error?.message || "Unknown API error",
        openAiResponse: JSON.stringify(errorData)
      };
    }
    
    // Parse the response
    const responseData = await response.json();
    console.log("OpenAI API response:", JSON.stringify(responseData));
    
    // Extract the content from the response
    const responseContent = responseData.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("No content in OpenAI response");
    }
    
    // Try to parse the content as JSON
    try {
      // Extract JSON from the content if needed
      const jsonString = extractJsonFromText(responseContent);
      const measurements = safeJsonParse(jsonString);
      
      return {
        measurements,
        success: true,
        note: "These measurements were extracted from the EagleView report images using OpenAI's API.",
        openAiResponse: responseContent
      };
    } catch (parseError) {
      console.error("Error parsing OpenAI response:", parseError);
      
      // Return simulated measurements if parsing fails
      return {
        measurements: generateSimulatedMeasurements(),
        success: false,
        note: "These are simulated measurements. Failed to parse the OpenAI response.",
        error: parseError.message,
        openAiResponse: responseContent
      };
    }
  } catch (err) {
    console.error("Error in processEagleViewImages:", err);
    
    // Return simulated measurements if processing fails
    return {
      measurements: generateSimulatedMeasurements(),
      success: false,
      note: "These are simulated measurements. The image processing failed.",
      error: err.message
    };
  }
}

// Main handler for HTTP requests
serve(async (req) => {
  // Set CORS headers
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  });

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    // Parse request body
    const requestData = await req.json();
    const { 
      imageBase64Array, // Array of base64-encoded images from PDF pages 1, 9, and 10
      modelType = "gpt-4o" 
    } = requestData;
    
    console.log(`Received request with model type: ${modelType}`);
    console.log(`Number of images: ${imageBase64Array ? imageBase64Array.length : 0}`);
    
    if (!imageBase64Array || !Array.isArray(imageBase64Array) || imageBase64Array.length === 0) {
      console.log("No images provided, returning simulated measurements");
      return new Response(
        JSON.stringify({
          measurements: generateSimulatedMeasurements(),
          success: false,
          note: "These are simulated measurements. No images were provided.",
          error: "No images provided in the request."
        }),
        { 
          headers: { ...headers, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }
    
    // Process the images
    const result = await processEagleViewImages(imageBase64Array, modelType);
    
    // Return response
    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...headers, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    
    // Return error response
    return new Response(
      JSON.stringify({ 
        error: `Error processing request: ${error.message}`,
        measurements: generateSimulatedMeasurements(),
        success: false,
        note: "These are simulated measurements. Failed to process the request."
      }),
      { 
        headers: { ...headers, 'Content-Type': 'application/json' },
        status: 200  // Return 200 even for errors to avoid client issues
      }
    );
  }
});
