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
import { processEagleViewPdf } from "../pdf-to-images";

export function usePdfParser() {
  const [parsedData, setParsedData] = useState<ParsedMeasurements | null>(null);
  const [processingMode, setProcessingMode] = useState<ProcessingMode>("regular");
  const [modelType, setModelType] = useState<ModelType>("gpt-4o-mini"); // Default to mini for faster processing
  const [useImageConversion, setUseImageConversion] = useState<boolean>(false); // Set to false by default to use pdfjs-serverless

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
      
      // If this is an EagleView PDF and image conversion is enabled, use the new approach
      if (useImageConversion && file.name.toLowerCase().includes("eagleview")) {
        return await parseEagleViewPdfWithImages(file, setStatus, setErrorDetails);
      }
      
      // Otherwise, use the pdfjs-serverless approach through Supabase Edge Function
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

  // Method for parsing EagleView PDFs using image conversion (legacy approach)
  const parseEagleViewPdfWithImages = async (
    file: File,
    setStatus: React.Dispatch<React.SetStateAction<FileUploadStatus>>,
    setErrorDetails: React.Dispatch<React.SetStateAction<string>>
  ) => {
    try {
      setStatus("parsing");
      console.log("Using image conversion approach for EagleView PDF");
      
      // Process the PDF using our new method
      const result = await processEagleViewPdf(file, modelType);
      
      if (!result.success) {
        console.error("PDF processing failed:", result.error);
        setErrorDetails(result.error || "Failed to process EagleView PDF");
        setStatus("error");
        return null;
      }
      
      // Reset parsedData before setting the new data
      setParsedData(null);
      
      // Store the parsed measurements
      setParsedData(result.measurements);
      
      // Set status to success
      setStatus("success");
      
      console.log("Successfully processed EagleView PDF with image conversion");
      return result.measurements;
    } catch (error: any) {
      console.error("Error parsing EagleView PDF with images:", error);
      setErrorDetails(`Error: ${error.message}`);
      setStatus("error");
      return null;
    }
  };

  return {
    parsedData,
    setParsedData,
    parsePdf,
    processingMode,
    modelType,
    setModelType,
    useImageConversion,
    setUseImageConversion
  };
}
