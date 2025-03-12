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
import { parsePdfWithSupabase } from "./pdf-parsing-service";

export function usePdfParser() {
  const [parsedData, setParsedData] = useState<ParsedMeasurements | null>(null);
  const [processingMode, setProcessingMode] = useState<ProcessingMode>("regular");
  
  const parsePdf = async (
    file: File, 
    setStatus: React.Dispatch<React.SetStateAction<FileUploadStatus>>,
    setErrorDetails: React.Dispatch<React.SetStateAction<string>>
  ) => {
    setStatus("uploading");
    setErrorDetails("");
    
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
      
      // Set processing mode based on file size
      if (fileSizeMB > 2) {
        setProcessingMode("fallback");
      } else {
        setProcessingMode("regular");
      }
      
      console.log(`Processing PDF file: ${file.name} (${fileSizeMB.toFixed(2)} MB) using mode: ${processingMode}`);
      
      try {
        // Parse PDF with Supabase using direct file upload
        const measurements = await parsePdfWithSupabase(
          file,
          fileSizeMB,
          processingMode,
          setStatus,
          setErrorDetails
        );
        
        // Reset parsedData before setting the new data to ensure we don't keep old state
        setParsedData(null);
        
        // Store the parsed measurements
        setParsedData(measurements);
        
        return measurements;
      } catch (processingError) {
        throw processingError; // Let the main error handler deal with it
      }
    } catch (error: any) {
      handleGeneralPdfError(error, setStatus, setErrorDetails);
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
