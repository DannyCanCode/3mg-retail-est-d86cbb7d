import { useState } from "react";
import { ParsedMeasurements } from "@/api/measurements";
import { readFileAsBase64 } from "../pdf-utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Define the FileUploadStatus type to match with useFileUpload
export type FileUploadStatus = "idle" | "uploading" | "parsing" | "success" | "error";

export function usePdfParser() {
  const [parsedData, setParsedData] = useState<ParsedMeasurements | null>(null);

  const parsePdf = async (
    file: File, 
    setStatus: React.Dispatch<React.SetStateAction<FileUploadStatus>>,
    setErrorDetails: React.Dispatch<React.SetStateAction<string>>
  ) => {
    setStatus("uploading");
    setErrorDetails("");
    
    try {
      // First, read the file as base64
      const base64File = await readFileAsBase64(file);
      setStatus("parsing");
      
      // Call the edge function to parse the PDF
      try {
        // Add a timestamp to prevent caching on the Supabase side
        const timestamp = new Date().getTime();
        
        const { data, error } = await supabase.functions.invoke('parse-eagleview-pdf', {
          body: { 
            fileName: file.name,
            pdfBase64: base64File,
            timestamp: timestamp // Add timestamp to prevent caching
          }
        });
        
        if (error) {
          console.error("Supabase function error:", error);
          setErrorDetails(`Error: ${error.message}`);
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
        } else {
          setErrorDetails(functionError.message || "Unknown edge function error");
        }
        
        setStatus("error");
        throw functionError;
      }
    } catch (error: any) {
      console.error("Error parsing PDF:", error);
      setStatus("error");
      if (!setErrorDetails) {
        setErrorDetails(error.message || "Unknown error occurred");
      }
      toast({
        title: "Parsing failed",
        description: "There was an error processing your file. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  return {
    parsedData,
    setParsedData,
    parsePdf
  };
}
