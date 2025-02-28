
import { supabase } from "@/integrations/supabase/client";
import { ParsedMeasurements } from "@/api/measurements";
import { FileUploadStatus } from "./useFileUpload";
import { ModelType, ProcessingMode } from "./pdf-constants";
import { 
  handleEdgeFunctionError, 
  handleSuccessfulParsing 
} from "./pdf-error-handler";
import { toast } from "@/hooks/use-toast";

export const parsePdfWithSupabase = async (
  fileName: string,
  base64File: string,
  fileSizeMB: number,
  processingMode: ProcessingMode,
  modelType: ModelType,
  setStatus: React.Dispatch<React.SetStateAction<FileUploadStatus>>,
  setErrorDetails: React.Dispatch<React.SetStateAction<string>>
): Promise<ParsedMeasurements | null> => {
  try {
    setStatus("parsing");
    
    // Add a timestamp to prevent caching on the Supabase side
    const timestamp = new Date().getTime();
    const requestId = crypto.randomUUID(); // Generate unique request ID
    
    console.log(`Sending file ${fileName} (${fileSizeMB.toFixed(2)} MB) to parse-eagleview-pdf. Request ID: ${requestId}, Model: ${modelType}`);
    
    // Include processing mode and model type in request
    const { data, error } = await supabase.functions.invoke('parse-eagleview-pdf', {
      body: { 
        fileName: fileName,
        pdfBase64: base64File,
        timestamp,
        requestId,
        processingMode: processingMode,
        modelType: modelType // Send the selected model type to the API
      }
    });
    
    if (error) {
      console.error("Supabase function error:", error);
      
      // Check if it's a size-related error
      if (error.message && (
        error.message.includes("too long") || 
        error.message.includes("too large") || 
        error.message.includes("context length") ||
        error.message.includes("maximum context length")
      )) {
        // If in regular mode, try fallback mode
        if (processingMode === "regular") {
          console.log("Switching to fallback processing mode due to size issues");
          toast({
            title: "Using optimized processing",
            description: "The file is large, switching to optimized processing mode.",
            variant: "default",
          });
          
          // Retry with fallback mode
          return tryFallbackProcessing(fileName, base64File, fileSizeMB, setStatus, setErrorDetails);
        } else {
          // Already in fallback mode, can't process
          setErrorDetails(`Error: The PDF file is too complex to process. Please try a smaller file with fewer pages.`);
        }
      } else if (error.message && error.message.includes("Invalid PDF format")) {
        // Handle invalid PDF format specifically
        setErrorDetails(`Error: The file appears to be corrupted or is not a standard PDF format. Please try a different file.`);
        toast({
          title: "Invalid PDF format",
          description: "The file couldn't be processed. It may be corrupted or not in a standard format.",
          variant: "destructive",
        });
      } else {
        setErrorDetails(`Error: ${error.message}`);
      }
      throw error;
    }
    
    // Check if there's an error message in the response
    if (data && data.error) {
      console.error("PDF parsing error:", data.error);
      
      // Handle specific error for invalid PDF format
      if (data.error.includes("Invalid PDF format") || data.error.includes("Expected base64")) {
        setErrorDetails(`Error: ${data.error}. Please try a different PDF file.`);
        toast({
          title: "Invalid PDF format",
          description: "The file couldn't be processed. Please upload a standard PDF document.",
          variant: "destructive",
        });
      } else {
        setErrorDetails(data.error);
      }
      throw new Error(data.error);
    }
    
    if (!data || !data.measurements) {
      setErrorDetails("The parsing service returned invalid data");
      throw new Error("Invalid response data");
    }
    
    console.log("Parsed measurements:", data.measurements);
    
    // Handle success
    handleSuccessfulParsing(fileName, setStatus, data.truncated);
    
    return data.measurements;
    
  } catch (functionError: any) {
    handleEdgeFunctionError(functionError, fileSizeMB, setErrorDetails, setStatus);
    throw functionError;
  }
};

// Helper function to try fallback processing mode
const tryFallbackProcessing = async (
  fileName: string,
  base64File: string,
  fileSizeMB: number,
  setStatus: React.Dispatch<React.SetStateAction<FileUploadStatus>>,
  setErrorDetails: React.Dispatch<React.SetStateAction<string>>
): Promise<ParsedMeasurements | null> => {
  try {
    const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke('parse-eagleview-pdf', {
      body: { 
        fileName: fileName,
        pdfBase64: base64File,
        timestamp: new Date().getTime(),
        requestId: crypto.randomUUID(),
        processingMode: "fallback",
        modelType: "gpt-4o-mini" // Always use mini model for fallback
      }
    });
    
    if (fallbackError) {
      console.error("Fallback processing error:", fallbackError);
      setErrorDetails(`Error: ${fallbackError.message}`);
      throw fallbackError;
    }
    
    if (!fallbackData || !fallbackData.measurements) {
      setErrorDetails("The parsing service returned invalid data in fallback mode");
      throw new Error("Invalid response data");
    }
    
    console.log("Parsed measurements (fallback mode):", fallbackData.measurements);
    
    // Handle success
    handleSuccessfulParsing(fileName, setStatus);
    
    return fallbackData.measurements;
  } catch (error: any) {
    handleEdgeFunctionError(error, fileSizeMB, setErrorDetails, setStatus);
    throw error;
  }
};
