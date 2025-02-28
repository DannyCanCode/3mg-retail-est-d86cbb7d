
import React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStatusProps {
  resetUpload: () => void;
}

export function ErrorStatus({ resetUpload }: ErrorStatusProps) {
  return (
    <>
      <div className="p-4 rounded-full bg-[#ef4444]/10 mb-4">
        <AlertCircle className="h-8 w-8 text-[#ef4444]" />
      </div>
      <h3 className="text-lg font-medium mb-1">Processing Failed</h3>
      <p className="text-muted-foreground text-sm mb-6 text-center">
        There was an error processing your file. Please try again.
      </p>
      <Button variant="outline" onClick={resetUpload}>
        Try Again
      </Button>
    </>
  );
}
