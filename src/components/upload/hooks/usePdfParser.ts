import { useState } from "react";
import { ParsedMeasurements } from "@/api/measurements";
import { validatePdfFile } from "../pdf-utils";
import { FileUploadStatus } from "./useFileUpload";
import { ProcessingMode } from "./pdf-constants";
import { 
  handlePdfSizeError, 
  handleInvalidPdfError, 
  handleGeneralPdfError
} from "./pdf-error-handler";
import { processPdfWithSupabase } from "@/api/pdf-service";
import { isSupabaseConfigured } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function usePdfParser() {
  const [parsedData, setParsedData] = useState<ParsedMeasurements | null>(null);
  const [processingMode, setProcessingMode] = useState<ProcessingMode>("supabase");
  const [processingProgress, setProcessingProgress] = useState<{
    page: number;
    totalPages: number;
    status: string;
  } | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  
  const parsePdf = async (
    file: File, 
    setStatus: React.Dispatch<React.SetStateAction<FileUploadStatus>>,
    setErrorDetails: React.Dispatch<React.SetStateAction<string>>
  ) => {
    setStatus("uploading");
    setErrorDetails("");
    setProcessingProgress(null);
    setFileUrl(null);
    
    try {
      // Validate that this is actually a PDF file
      if (!validatePdfFile(file)) {
        handleInvalidPdfError(setErrorDetails, setStatus);
        return null;
      }
      
      // First, check file size - warn if it's large
      const fileSizeMB = file.size / (1024 * 1024);
      
      // Handle size errors and warnings
      if (!handlePdfSizeError(fileSizeMB, setErrorDetails, setStatus)) {
        return null;
      }
      
      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        toast({
          title: "Supabase not configured",
          description: "Please provide Supabase API keys to process PDFs.",
          variant: "destructive",
        });
        setStatus("error");
        setErrorDetails("Supabase API keys are missing. Please provide them in the .env file.");
        return null;
      }
      
      // Set processing mode
      setProcessingMode("supabase");
      
      console.log(`Processing PDF file: ${file.name} (${fileSizeMB.toFixed(2)} MB) using Supabase function`);
      
      setStatus("parsing");
      setProcessingProgress({
        page: 0,
        totalPages: 1,
        status: "Uploading PDF to Supabase..."
      });
      
      try {
        // Process PDF with Supabase
        const { data, error, fileUrl } = await processPdfWithSupabase(file);
        
        if (error) {
          console.error("Error processing PDF with Supabase:", error);
          setStatus("error");
          setErrorDetails(`Error: ${error.message}`);
          return null;
        }
        
        if (!data) {
          setStatus("error");
          setErrorDetails("No data returned from PDF processing");
          return null;
        }
        
        // Set the file URL (for downloading or viewing)
        if (fileUrl) {
          setFileUrl(fileUrl);
        }
        
        // Reset parsedData before setting the new data to ensure we don't keep old state
        setParsedData(null);
        
        // Store the parsed measurements
        setParsedData(data);
        
        setStatus("success");
        
        // Show success message
        console.log("PDF processing complete", data);
        
        return data;
      } catch (processingError) {
        console.error("PDF processing error:", processingError);
        setStatus("error");
        setErrorDetails(`Error processing PDF: ${processingError.message}`);
        return null;
      }
    } catch (error: any) {
      handleGeneralPdfError(error, setStatus, setErrorDetails);
      return null;
    } finally {
      setProcessingProgress(null);
    }
  };

  return {
    parsedData,
    setParsedData,
    parsePdf,
    processingMode,
    processingProgress,
    fileUrl
  };
}
