
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

export type FileUploadStatus = "idle" | "uploading" | "parsing" | "success" | "error";

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
    // Check if it's a PDF
    if (!selectedFile.type.includes("pdf")) {
      toast({
        title: "Invalid file format",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
      return null;
    }
    
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
