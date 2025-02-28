
import React from "react";
import { FileText, Loader2 } from "lucide-react";
import { FileUploadStatus } from "./hooks/useFileUpload";

interface ProcessingStatusProps {
  status: Extract<FileUploadStatus, "uploading" | "parsing">;
  fileName: string;
}

export function ProcessingStatus({ status, fileName }: ProcessingStatusProps) {
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
        {status === "uploading" ? "Uploading" : "Parsing"} {fileName}
      </h3>
      <p className="text-muted-foreground text-sm mb-6 text-center">
        {status === "uploading" 
          ? "Uploading your file..." 
          : "Extracting measurements with AI..."}
      </p>
      <div className="w-full max-w-xs bg-secondary rounded-full h-2.5 mb-4">
        <div className="bg-accent h-2.5 rounded-full w-2/3 animate-pulse-soft"></div>
      </div>
    </>
  );
}
