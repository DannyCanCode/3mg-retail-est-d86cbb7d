
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { validatePdfFile } from "../pdf-utils";

export type FileUploadStatus = "idle" | "uploading" | "parsing" | "success" | "error";

// Maximum file size in MB
const MAX_FILE_SIZE_MB = 6;

export function useFileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<FileUploadStatus>("idle");
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [errorDetails, setErrorDetails] = useState<string>("");

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      return validateAndSetFile(files[0]);
    }
    return null;
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      return validateAndSetFile(files[0]);
    }
    return null;
  };

  const validateAndSetFile = (selectedFile: File) => {
    // Check if it's a valid PDF
    if (!validatePdfFile(selectedFile)) {
      toast({
        title: "Invalid file format",
        description: "Please upload a valid PDF file.",
        variant: "destructive",
      });
      return null;
    }
    
    // Check file size
    const fileSizeMB = selectedFile.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      toast({
        title: "File too large",
        description: `Maximum file size is ${MAX_FILE_SIZE_MB}MB. Your file is ${fileSizeMB.toFixed(1)}MB.`,
        variant: "destructive",
      });
      return null;
    }
    
    // If file is larger than 2MB but under the max, warn the user
    if (fileSizeMB > 2) {
      toast({
        title: "Large file detected",
        description: "Files over 2MB may take longer to process or fail. Processing will use optimized mode.",
        variant: "default",
      });
    }
    
    console.log(`File validated: ${selectedFile.name} (${fileSizeMB.toFixed(2)}MB)`);
    setFile(selectedFile);
    return selectedFile;
  };

  const resetUpload = () => {
    setFile(null);
    setStatus("idle");
    setErrorDetails("");
  };

  return {
    file,
    status,
    setStatus,
    dragActive,
    errorDetails,
    setErrorDetails,
    handleDrag,
    handleDrop,
    handleFileInput,
    resetUpload,
    validateAndSetFile
  };
}
