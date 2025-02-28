
import { useState } from "react";
import { ParsedMeasurements } from "@/api/measurements";
import { readFileAsBase64 } from "../pdf-utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Define the FileUploadStatus type to match with useFileUpload
export type FileUploadStatus = "idle" | "uploading" | "parsing" | "success" | "error";

// Maximum recommended file size in MB before warning users
const MAX_RECOMMENDED_SIZE_MB = 2;
// Absolute maximum file size in MB that we'll attempt to process
const MAX_ALLOWED_SIZE_MB = 4;

export function usePdfParser() {
  const [parsedData, setParsedData] = useState<ParsedMeasurements | null>(null);
  const [processingMode, setProcessingMode] = useState<"regular" | "fallback">("regular");

  const parsePdf = async (
    file: File, 
    setStatus: React.Dispatch<React.SetStateAction<FileUploadStatus>>,
    setErrorDetails: React.Dispatch<React.SetStateAction<string>>
  ) => {
    setStatus("uploading");
    setErrorDetails("");
    
    try {
      // First, check file size - warn if it's large
      const fileSizeMB = file.size / (1024 * 1024);
      
      // If file is too large, reject immediately
      if (fileSizeMB > MAX_ALLOWED_SIZE_MB) {
        setErrorDetails(`Error: The PDF file is too large (${fileSizeMB.toFixed(2)} MB). Maximum allowed size is ${MAX_ALLOWED_SIZE_MB} MB.`);
        setStatus("error");
        toast({
          title: "File too large",
          description: `This file exceeds our ${MAX_ALLOWED_SIZE_MB} MB limit. Please use a smaller file.`,
          variant: "destructive",
        });
        return null;
      }
      
      // Warn if file is large but still under max allowed
      if (fileSizeMB > MAX_RECOMMENDED_SIZE_MB) {
        console.log(`Large file detected: ${file.name} (${fileSizeMB.toFixed(2)} MB)`);
        toast({
          title: "Large file detected",
          description: `This file is ${fileSizeMB.toFixed(2)} MB which might take longer to process.`,
          variant: "default",
        });
        // Automatically set to fallback mode for large files
        setProcessingMode("fallback");
      } else {
        setProcessingMode("regular");
      }
      
      // Read the file as base64
      const base64File = await readFileAsBase64(file);
      console.log(`Base64 length: ${base64File.length} chars`);
      setStatus("parsing");
      
      // Call the edge function to parse the PDF
      try {
        // Add a timestamp to prevent caching on the Supabase side
        const timestamp = new Date().getTime();
        const requestId = crypto.randomUUID(); // Generate unique request ID
        
        console.log(`Sending file ${file.name} (${fileSizeMB.toFixed(2)} MB) to parse-eagleview-pdf. Request ID: ${requestId}`);
        
        // Include processing mode in request
        const { data, error } = await supabase.functions.invoke('parse-eagleview-pdf', {
          body: { 
            fileName: file.name,
            pdfBase64: base64File,
            timestamp,
            requestId,
            processingMode: processingMode // Include the processing mode
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
              setProcessingMode("fallback");
              toast({
                title: "Using optimized processing",
                description: "The file is large, switching to optimized processing mode.",
                variant: "default",
              });
              
              // Retry with fallback mode
              const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke('parse-eagleview-pdf', {
                body: { 
                  fileName: file.name,
                  pdfBase64: base64File,
                  timestamp: new Date().getTime(),
                  requestId: crypto.randomUUID(),
                  processingMode: "fallback"
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
              setParsedData(fallbackData.measurements);
              setStatus("success");
              toast({
                title: "Parsing successful",
                description: `${file.name} has been processed with optimized mode.`,
              });
              return fallbackData.measurements;
            } else {
              // Already in fallback mode, can't process
              setErrorDetails(`Error: The PDF file is too complex to process. Please try a smaller file with fewer pages.`);
            }
          } else {
            setErrorDetails(`Error: ${error.message}`);
          }
          throw error;
        }
        
        // Check if there's an error message in the response
        if (data.error) {
          console.error("PDF parsing error:", data.error);
          setErrorDetails(data.error);
          throw new Error(data.error);
        }
        
        if (!data || !data.measurements) {
          setErrorDetails("The parsing service returned invalid data");
          throw new Error("Invalid response data");
        }
        
        console.log("Parsed measurements:", data.measurements);
        
        // Check if the file was truncated
        if (data.truncated) {
          toast({
            title: "File was truncated",
            description: "The file was too large and was processed with reduced detail. Some measurements might be approximate.",
            variant: "default",
          });
        }
        
        // Reset parsedData before setting the new data to ensure we don't keep old state
        setParsedData(null);
        
        // Store the parsed measurements
        setParsedData(data.measurements);
        
        setStatus("success");
        toast({
          title: "Parsing successful",
          description: `${file.name} has been processed.`,
        });

        return data.measurements;
      } catch (functionError: any) {
        console.error("Edge function error:", functionError);
        
        // Check if it's a connection error
        if (functionError.message && functionError.message.includes("Failed to send a request")) {
          setErrorDetails("Connection to Edge Function failed. This might be due to a temporary network issue or the function is still being deployed. Please try again in a moment.");
        } 
        // Check if it's a size-related or token limit error
        else if (functionError.message && (
            functionError.message.includes("too long") || 
            functionError.message.includes("too large") ||
            functionError.message.includes("context length") ||
            functionError.message.includes("maximum context length")
        )) {
          setErrorDetails(`The PDF file is too complex to process (${fileSizeMB.toFixed(2)} MB). Please try a smaller file or one with fewer pages.`);
        } 
        else {
          setErrorDetails(functionError.message || "Unknown edge function error");
        }
        
        setStatus("error");
        throw functionError;
      }
    } catch (error: any) {
      console.error("Error parsing PDF:", error);
      setStatus("error");
      
      // If no error details have been set yet, set a generic message
      if (!setErrorDetails) {
        setErrorDetails(error.message || "Unknown error occurred");
      }
      
      toast({
        title: "Parsing failed",
        description: "There was an error processing your file. Please try again with a smaller file.",
        variant: "destructive",
      });
      return null;
    }
  };

  return {
    parsedData,
    setParsedData,
    parsePdf,
    processingMode
  };
}
