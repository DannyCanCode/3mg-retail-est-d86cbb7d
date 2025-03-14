import { useState } from "react";
import { ParsedMeasurements } from "@/api/measurements";
import { validatePdfFile, processPdfInBrowser, extractMeasurementsFromText } from "../pdf-utils";
import { FileUploadStatus } from "./useFileUpload";
import { ProcessingMode } from "./pdf-constants";
import { 
  handlePdfSizeError, 
  handleInvalidPdfError, 
  handleGeneralPdfError
} from "./pdf-error-handler";

export function usePdfParser() {
  const [parsedData, setParsedData] = useState<ParsedMeasurements | null>(null);
  const [processingMode, setProcessingMode] = useState<ProcessingMode>("regular");
  const [processingProgress, setProcessingProgress] = useState<{
    page: number;
    totalPages: number;
    status: string;
  } | null>(null);
  
  const parsePdf = async (
    file: File, 
    setStatus: React.Dispatch<React.SetStateAction<FileUploadStatus>>,
    setErrorDetails: React.Dispatch<React.SetStateAction<string>>
  ) => {
    setStatus("uploading");
    setErrorDetails("");
    setProcessingProgress(null);
    
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
      
      setStatus("parsing");
      setProcessingProgress({
        page: 0,
        totalPages: 0,
        status: "Loading PDF..."
      });
      
      try {
        // Process PDF directly in the browser
        const { text, pageCount } = await processPdfInBrowser(file);
        
        setProcessingProgress({
          page: pageCount,
          totalPages: pageCount,
          status: "Extracting measurements..."
        });
        
        // Extract measurements from the text
        const measurements = extractMeasurementsFromText(text);
        
        // Reset parsedData before setting the new data to ensure we don't keep old state
        setParsedData(null);
        
        // Store the parsed measurements
        setParsedData(measurements);
        
        setStatus("success");
        
        // Show success message
        console.log("PDF processing complete", measurements);
        
        return measurements;
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
    processingProgress
  };
}
