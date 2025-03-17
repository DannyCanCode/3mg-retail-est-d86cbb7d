import React from "react";
import { FileText, Loader2 } from "lucide-react";
import { FileUploadStatus } from "./hooks/useFileUpload";
import "./processing-status.css";

interface ProcessingStatusProps {
  status: Extract<FileUploadStatus, "uploading" | "parsing">;
  fileName: string;
  processingMode?: string;
  progress?: {
    page: number;
    totalPages: number;
    status: string;
  } | null;
}

export function ProcessingStatus({ status, fileName, processingMode, progress }: ProcessingStatusProps) {
  // Calculate progress percentage
  const progressPercentage = progress && progress.totalPages > 0 
    ? Math.min(100, Math.round((progress.page / progress.totalPages) * 100)) 
    : null;
  
  // Get status message
  const getStatusMessage = () => {
    if (status === "uploading") {
      return "Uploading your file...";
    }
    
    if (progress && progress.status) {
      return progress.status;
    }
    
    return `Processing PDF with ${processingMode || 'standard'} mode...`;
  };
  
  return (
    <>
      <div className="p-4 rounded-full bg-secondary mb-4">
        {status === "uploading" ? (
          <FileText className="h-8 w-8 text-accent animate-pulse" />
        ) : (
          <Loader2 className="h-8 w-8 text-accent animate-spin" />
        )}
      </div>
      <h3 className="text-lg font-medium mb-1">
        {status === "uploading" ? "Uploading" : "Processing"} {fileName}
      </h3>
      <p className="text-muted-foreground text-sm mb-4 text-center">
        {getStatusMessage()}
        {progress && progress.totalPages > 0 && status === "parsing" && (
          <> (Page {progress.page} of {progress.totalPages})</>
        )}
      </p>
      <div className="progress-bar">
        <div 
          className={`progress-bar-fill animate ${!progressPercentage ? 'default-width' : ''}`}
          style={progressPercentage ? { width: `${progressPercentage}%` } : undefined}
        ></div>
      </div>
    </>
  );
}
