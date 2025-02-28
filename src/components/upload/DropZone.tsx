
import React from "react";
import { Upload, FileText, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DropZoneProps {
  dragActive: boolean;
  handleDrag: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function DropZone({ dragActive, handleDrag, handleDrop, handleFileInput }: DropZoneProps) {
  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center transition-all",
        dragActive ? "border-accent bg-accent/5" : "border-border"
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        id="pdf-upload"
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleFileInput}
      />
      
      <div className="p-4 rounded-full bg-secondary mb-4">
        <Upload className="h-8 w-8 text-accent" />
      </div>
      
      <h3 className="text-lg font-medium mb-1">Upload EagleView PDF</h3>
      <p className="text-muted-foreground text-sm mb-6 text-center max-w-md">
        Drag and drop your file here, or click to browse your files
      </p>
      
      <Button 
        onClick={() => document.getElementById("pdf-upload")?.click()}
        className="flex items-center mb-6"
      >
        <FileText className="mr-2 h-4 w-4" />
        Browse Files
      </Button>
      
      <div className="flex items-start space-x-2 text-xs text-muted-foreground">
        <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium">Recommended file requirements:</p>
          <ul className="list-disc pl-4 mt-1 space-y-1">
            <li>File format: PDF</li>
            <li>Size: Less than 2MB for best results</li>
            <li>Standard EagleView report format</li>
            <li>Complete, properly formatted PDF (not encrypted or damaged)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
