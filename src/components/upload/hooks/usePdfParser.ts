import { useState } from "react";
import { ParsedMeasurements } from "@/api/measurements";
import { readFileAsBase64, validatePdfFile } from "../pdf-utils";
import { FileUploadStatus } from "./useFileUpload";
import { ModelType, ProcessingMode } from "./pdf-constants";
import { 
  handlePdfSizeError, 
  handleInvalidPdfError, 
  handleBase64ConversionError,
  handleGeneralPdfError
} from "./pdf-error-handler";
import { parsePdfWithSupabase } from "./pdf-parsing-service";

export function usePdfParser() {
  const [parsedData, setParsedData] = useState<ParsedMeasurements | null>(null);
  const [processingMode, setProcessingMode] = useState<ProcessingMode>("regular");
  const [modelType, setModelType] = useState<ModelType>("gpt-4o-mini"); // Default to mini for faster processing

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
      
      // Use the pdfjs-serverless approach through Supabase Edge Function
      try {
        const base64File = await readFileAsBase64(file);
        console.log(`Base64 length: ${base64File.length} chars`);
        
        // Extra validation for base64 format
        if (!base64File || base64File.trim().length === 0) {
          throw new Error("Failed to convert PDF to base64 format");
        }
        
        // Parse PDF with Supabase
        const measurements = await parsePdfWithSupabase(
          file.name,
          base64File,
          fileSizeMB,
          processingMode,
          modelType,
          setStatus,
          setErrorDetails
        );
        
        // Reset parsedData before setting the new data to ensure we don't keep old state
        setParsedData(null);
        
        // Store the parsed measurements
        setParsedData(measurements);
        
        return measurements;
      } catch (base64Error) {
        handleBase64ConversionError(setStatus, setErrorDetails);
        return null;
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
    processingMode,
    modelType,
    setModelType
  };
}
