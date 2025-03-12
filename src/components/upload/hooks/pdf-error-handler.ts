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
  
  // Check if it's a connection error
  if (error.message && error.message.includes("Failed to send a request")) {
    setErrorDetails("Connection to Edge Function failed. This might be due to a temporary network issue or the function is still being deployed. Please try again in a moment.");
  } 
  // Check if it's an invalid PDF format error
  else if (error.message && error.message.includes("Invalid PDF format")) {
    setErrorDetails("The file appears to be corrupted or isn't in a standard PDF format. Please try a different PDF file.");
  }
  // Check if it's a size-related or token limit error
  else if (error.message && (
      error.message.includes("too long") || 
      error.message.includes("too large") ||
      error.message.includes("context length") ||
      error.message.includes("maximum context length")
  )) {
    setErrorDetails(`The PDF file is too complex to process (${fileSizeMB.toFixed(2)} MB). Please try a smaller file or one with fewer pages.`);
  } 
  // Check if it's a fetch error
  else if (error.message && error.message.includes("Failed to fetch PDF")) {
    setErrorDetails("Failed to access PDF file from storage. Please try uploading again.");
  }
  else {
    setErrorDetails(error.message || "Unknown edge function error");
  }
  
  setStatus("error");
};

export const handleGeneralPdfError = (
  error: any,
  setStatus: React.Dispatch<React.SetStateAction<FileUploadStatus>>,
  setErrorDetails: React.Dispatch<React.SetStateAction<string>>
) => {
  console.error("Error parsing PDF:", error);
  setStatus("error");
  
  // Set a generic message if no specific error was already set
  if (!setErrorDetails) {
    setErrorDetails(error.message || "Unknown error occurred");
  }
  
  toast({
    title: "Parsing failed",
    description: "There was an error processing your file. Please try again with a smaller file.",
    variant: "destructive",
  });
};

export const handleSuccessfulParsing = (
  fileName: string, 
  setStatus: React.Dispatch<React.SetStateAction<FileUploadStatus>>,
  wasTruncated: boolean = false
) => {
  setStatus("success");
  
  if (wasTruncated) {
    toast({
      title: "File was truncated",
      description: "The file was too large and was processed with reduced detail. Some measurements might be approximate.",
      variant: "default",
    });
  }
  
  toast({
    title: "Parsing successful",
    description: `${fileName} has been processed.`,
  });
};
