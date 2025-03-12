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
  file: File,
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
    
    console.log(`Processing file ${file.name} (${fileSizeMB.toFixed(2)} MB) with parse-eagleview-pdf. Request ID: ${requestId}, Model: ${modelType}`);
    
    // Create form data for file upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', file.name);
    formData.append('timestamp', timestamp.toString());
    formData.append('requestId', requestId);
    formData.append('processingMode', processingMode);
    formData.append('modelType', modelType);
    
    // Upload the file to Supabase Storage first
    const fileExt = file.name.split('.').pop();
    const filePath = `${requestId}-${timestamp}.${fileExt}`;
    
    console.log(`Uploading file to Supabase Storage: ${filePath}`);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pdf-uploads')
      .upload(filePath, file);
    
    if (uploadError) {
      console.error("File upload error:", uploadError);
      setErrorDetails(`Error uploading file: ${uploadError.message}`);
      throw uploadError;
    }
    
    console.log("File uploaded successfully:", uploadData);
    
    // Get the public URL for the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from('pdf-uploads')
      .getPublicUrl(filePath);
    
    const pdfUrl = publicUrlData.publicUrl;
    console.log("PDF public URL:", pdfUrl);
    
    // Call the Edge Function with the file URL
    const { data, error } = await supabase.functions.invoke('parse-eagleview-pdf', {
      body: { 
        fileName: file.name,
        pdfUrl,
        timestamp,
        requestId,
        processingMode,
        modelType
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
          return tryFallbackProcessing(file, fileSizeMB, filePath, setStatus, setErrorDetails);
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
      
      // Clean up the uploaded file
      await supabase.storage.from('pdf-uploads').remove([filePath]);
      throw error;
    }
    
    // Check if there's an error message in the response
    if (data && data.error) {
      console.error("PDF parsing error:", data.error);
      
      // Handle specific error for invalid PDF format
      if (data.error.includes("Invalid PDF format")) {
        setErrorDetails(`Error: ${data.error}. Please try a different PDF file.`);
        toast({
          title: "Invalid PDF format",
          description: "The file couldn't be processed. Please upload a standard PDF document.",
          variant: "destructive",
        });
      } else {
        setErrorDetails(data.error);
      }
      
      // Clean up the uploaded file
      await supabase.storage.from('pdf-uploads').remove([filePath]);
      throw new Error(data.error);
    }
    
    if (!data || !data.measurements) {
      setErrorDetails("The parsing service returned invalid data");
      
      // Clean up the uploaded file
      await supabase.storage.from('pdf-uploads').remove([filePath]);
      throw new Error("Invalid response data");
    }
    
    console.log("Parsed measurements:", data.measurements);
    
    // Handle success
    handleSuccessfulParsing(file.name, setStatus, data.truncated);
    
    // Clean up the uploaded file
    await supabase.storage.from('pdf-uploads').remove([filePath]);
    
    return data.measurements;
    
  } catch (functionError: any) {
    handleEdgeFunctionError(functionError, fileSizeMB, setErrorDetails, setStatus);
    throw functionError;
  }
};

// Helper function to try fallback processing mode
const tryFallbackProcessing = async (
  file: File,
  fileSizeMB: number,
  filePath: string,
  setStatus: React.Dispatch<React.SetStateAction<FileUploadStatus>>,
  setErrorDetails: React.Dispatch<React.SetStateAction<string>>
): Promise<ParsedMeasurements | null> => {
  try {
    // Get the public URL for the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from('pdf-uploads')
      .getPublicUrl(filePath);
    
    const pdfUrl = publicUrlData.publicUrl;
    
    const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke('parse-eagleview-pdf', {
      body: { 
        fileName: file.name,
        pdfUrl,
        timestamp: new Date().getTime(),
        requestId: crypto.randomUUID(),
        processingMode: "fallback",
        modelType: "gpt-4o-mini" // Always use mini model for fallback
      }
    });
    
    if (fallbackError) {
      console.error("Fallback processing error:", fallbackError);
      setErrorDetails(`Error: ${fallbackError.message}`);
      
      // Clean up the uploaded file
      await supabase.storage.from('pdf-uploads').remove([filePath]);
      throw fallbackError;
    }
    
    if (!fallbackData || !fallbackData.measurements) {
      setErrorDetails("The parsing service returned invalid data in fallback mode");
      
      // Clean up the uploaded file
      await supabase.storage.from('pdf-uploads').remove([filePath]);
      throw new Error("Invalid response data");
    }
    
    console.log("Parsed measurements (fallback mode):", fallbackData.measurements);
    
    // Handle success
    handleSuccessfulParsing(file.name, setStatus);
    
    // Clean up the uploaded file
    await supabase.storage.from('pdf-uploads').remove([filePath]);
    
    return fallbackData.measurements;
  } catch (error: any) {
    handleEdgeFunctionError(error, fileSizeMB, setErrorDetails, setStatus);
    throw error;
  }
};
