import { toast } from "@/hooks/use-toast";
import { FileUploadStatus } from "./useFileUpload";
import { MAX_ALLOWED_SIZE_MB, MAX_RECOMMENDED_SIZE_MB } from "./pdf-constants";

export const handlePdfSizeError = (
  fileSizeMB: number,
  setErrorDetails: React.Dispatch<React.SetStateAction<string>>,
  setStatus: React.Dispatch<React.SetStateAction<FileUploadStatus>>
): boolean => {
  // If file is too large, reject immediately
  if (fileSizeMB > MAX_ALLOWED_SIZE_MB) {
    setErrorDetails(`Error: The PDF file is too large (${fileSizeMB.toFixed(2)} MB). Maximum allowed size is ${MAX_ALLOWED_SIZE_MB} MB.`);
    setStatus("error");
    toast({
      title: "File too large",
      description: `This file exceeds our ${MAX_ALLOWED_SIZE_MB} MB limit. Please use a smaller file.`,
      variant: "destructive",
    });
    return false;
  }
  
  // Warn if file is large but still under max allowed
  if (fileSizeMB > MAX_RECOMMENDED_SIZE_MB) {
    console.log(`Large file detected: ${fileSizeMB.toFixed(2)} MB`);
    toast({
      title: "Large file detected",
      description: `This file is ${fileSizeMB.toFixed(2)} MB which might take longer to process.`,
      variant: "default",
    });
  }
  
  return true;
};

export const handleInvalidPdfError = (
  setErrorDetails: React.Dispatch<React.SetStateAction<string>>,
  setStatus: React.Dispatch<React.SetStateAction<FileUploadStatus>>
) => {
  setErrorDetails("Invalid file format. Please upload a valid PDF file.");
  setStatus("error");
  toast({
    title: "Invalid file format",
    description: "The file you uploaded does not appear to be a valid PDF. Please try with a different file.",
    variant: "destructive",
  });
};

export const handleEdgeFunctionError = (
  error: any,
  fileSizeMB: number,
  setErrorDetails: React.Dispatch<React.SetStateAction<string>>,
  setStatus: React.Dispatch<React.SetStateAction<FileUploadStatus>>
) => {
  console.error("Edge function error:", error);
  setStatus("error");
  
  // Check if it's a size-related error
  if (error.message && (
    error.message.includes("too long") || 
    error.message.includes("too large") || 
    error.message.includes("context length") ||
    error.message.includes("maximum context length")
  )) {
    setErrorDetails(`Error: The PDF file (${fileSizeMB.toFixed(2)} MB) is too complex to process. Please try a smaller file with fewer pages.`);
    toast({
      title: "File too complex",
      description: "The PDF contains too much data to process. Try a simpler PDF with fewer pages.",
      variant: "destructive",
    });
  } else {
    // Generic error handling
    setErrorDetails(error.message || "An unknown error occurred while processing the PDF");
    toast({
      title: "Processing error",
      description: "There was an error processing your file. Please try a different PDF file.",
      variant: "destructive",
    });
  }
};

export const handleGeneralPdfError = (
  error: any,
  setStatus: React.Dispatch<React.SetStateAction<FileUploadStatus>>,
  setErrorDetails: React.Dispatch<React.SetStateAction<string>>
) => {
  console.error("Error parsing PDF:", error);
  setStatus("error");
  
  // Set a generic message if no specific error was already set
  if (!error.message) {
    setErrorDetails("An unknown error occurred while processing the PDF. Please try a different file.");
  } else {
    setErrorDetails(`Error: ${error.message}`);
  }
  
  toast({
    title: "Parsing failed",
    description: "There was an error processing your file. Please try a different PDF file.",
    variant: "destructive",
  });
};

export const handleSuccessfulParsing = (
  fileName: string, 
  setStatus: React.Dispatch<React.SetStateAction<FileUploadStatus>>,
  showToast: boolean = true
) => {
  setStatus("success");
  
  if (showToast) {
    toast({
      title: "Parsing successful",
      description: `${fileName} has been processed successfully.`,
    });
  }
};
