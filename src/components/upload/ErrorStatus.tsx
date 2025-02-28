
import React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStatusProps {
  resetUpload: () => void;
  errorDetails?: string;
}

export function ErrorStatus({ resetUpload, errorDetails }: ErrorStatusProps) {
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
      
      <Button variant="outline" onClick={resetUpload}>
        Try Again
      </Button>
    </>
  );
}
