
import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStatusProps {
  resetUpload: () => void;
  errorDetails?: string;
}

export function ErrorStatus({ resetUpload, errorDetails }: ErrorStatusProps) {
  // Determine if it's a specific known error type
  const isPdfFormatError = errorDetails?.includes("Invalid PDF format");
  const isFileTooLargeError = errorDetails?.includes("too large") || errorDetails?.includes("maximum context length");
  
  // Generate a troubleshooting tip based on the error
  const getTroubleshootingTip = () => {
    if (isPdfFormatError) {
      return "Make sure your file is a valid PDF and not corrupted. Try downloading it again from the source.";
    }
    if (isFileTooLargeError) {
      return "The PDF is too large for processing. Try a smaller file or one with fewer pages.";
    }
    return "Try again with a different PDF file, or try at a later time if the issue persists.";
  };

  return (
    <>
      <div className="p-4 rounded-full bg-[#ef4444]/10 mb-4">
        <AlertCircle className="h-8 w-8 text-[#ef4444]" />
      </div>
      <h3 className="text-lg font-medium mb-1">Processing Failed</h3>
      <p className="text-muted-foreground text-sm mb-4 text-center max-w-md">
        There was an error processing your file. Please try again.
      </p>
      
      {errorDetails && (
        <div className="bg-[#ef4444]/5 p-3 rounded-md text-xs text-muted-foreground mb-6 max-w-md break-words">
          <p className="font-semibold mb-1">Error details:</p>
          <code>{errorDetails}</code>
        </div>
      )}
      
      <div className="bg-secondary/50 p-3 rounded-md text-xs text-muted-foreground mb-6 max-w-md">
        <p className="font-semibold mb-1">Troubleshooting tip:</p>
        <p>{getTroubleshootingTip()}</p>
      </div>
      
      <div className="flex space-x-3">
        <Button variant="outline" onClick={resetUpload} className="flex items-center">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    </>
  );
}
