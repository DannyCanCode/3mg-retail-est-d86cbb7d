
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type UploadStatus = "idle" | "uploading" | "parsing" | "success" | "error";

interface ParsedMeasurements {
  totalArea?: number;
  roofPitch?: string;
  ridgeLength?: number;
  valleyLength?: number;
  hipLength?: number;
  eaveLength?: number;
  rakeLength?: number;
  stepFlashingLength?: number;
  chimneyCount?: number;
  skylightCount?: number;
  ventCount?: number;
}

export function PdfUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [parsedData, setParsedData] = useState<ParsedMeasurements | null>(null);

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
    handleFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFiles(files);
    }
  };

  const handleFiles = (files: FileList) => {
    if (files.length > 0) {
      const selectedFile = files[0];
      
      // Check if it's a PDF
      if (!selectedFile.type.includes("pdf")) {
        toast({
          title: "Invalid file format",
          description: "Please upload a PDF file.",
          variant: "destructive",
        });
        return;
      }
      
      setFile(selectedFile);
      uploadAndParse(selectedFile);
    }
  };

  const uploadAndParse = async (file: File) => {
    setStatus("uploading");
    
    try {
      // First, read the file as base64
      const base64File = await readFileAsBase64(file);
      setStatus("parsing");
      
      // Call the parsing function (which will be implemented in an edge function)
      const response = await fetch('/api/parse-eagleview-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          fileName: file.name,
          pdfBase64: base64File 
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to parse PDF');
      }
      
      const result = await response.json();
      
      // Store the parsed measurements
      setParsedData(result.measurements);
      
      setStatus("success");
      toast({
        title: "Parsing successful",
        description: `${file.name} has been processed.`,
      });
    } catch (error) {
      console.error("Error parsing PDF:", error);
      setStatus("error");
      toast({
        title: "Parsing failed",
        description: "There was an error processing your file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
        const base64Content = base64String.split(',')[1];
        resolve(base64Content);
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });
  };

  const resetUpload = () => {
    setFile(null);
    setStatus("idle");
    setParsedData(null);
  };

  const saveToDatabase = async () => {
    if (!parsedData || !file) return;

    try {
      // Create a new measurement record in the database
      const response = await fetch('/api/save-measurement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          uploadDate: new Date().toISOString(),
          measurements: parsedData
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save measurements');
      }

      toast({
        title: "Measurements saved",
        description: "Measurements have been saved to your database.",
      });

      // Optionally, redirect to create a new estimate with these measurements
    } catch (error) {
      console.error("Error saving measurements:", error);
      toast({
        title: "Save failed",
        description: "Failed to save measurements to database.",
        variant: "destructive",
      });
    }
  };

  // Display measurement values in a readable format
  const renderMeasurementValue = (key: string, value: any) => {
    if (typeof value === 'undefined' || value === null) return 'N/A';
    
    if (key.toLowerCase().includes('length')) {
      return `${value} ft`;
    } else if (key === 'totalArea') {
      return `${value} sq ft`;
    } else if (key.toLowerCase().includes('count')) {
      return value;
    } else if (key === 'roofPitch') {
      return value;
    }
    
    return value;
  };

  return (
    <Card className="animate-slide-in-up" style={{ animationDelay: "0.3s" }}>
      <CardHeader>
        <CardTitle>Upload EagleView PDF</CardTitle>
        <CardDescription>
          Drag and drop your EagleView report to generate an estimate
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === "idle" ? (
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
              className="flex items-center"
            >
              <FileText className="mr-2 h-4 w-4" />
              Browse Files
            </Button>
          </div>
        ) : (
          <div className="p-8 flex flex-col items-center justify-center">
            {(status === "uploading" || status === "parsing") && (
              <>
                <div className="p-4 rounded-full bg-secondary mb-4">
                  {status === "uploading" ? (
                    <FileText className="h-8 w-8 text-accent animate-pulse" />
                  ) : (
                    <Loader2 className="h-8 w-8 text-accent animate-spin" />
                  )}
                </div>
                <h3 className="text-lg font-medium mb-1">
                  {status === "uploading" ? "Uploading" : "Parsing"} {file?.name}
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
            )}
            
            {status === "success" && (
              <>
                <div className="p-4 rounded-full bg-[#10b981]/10 mb-4">
                  <CheckCircle className="h-8 w-8 text-[#10b981]" />
                </div>
                <h3 className="text-lg font-medium mb-1">Parsing Complete</h3>
                <p className="text-muted-foreground text-sm mb-4 text-center">
                  {file?.name} has been processed successfully
                </p>
                
                {parsedData && (
                  <div className="w-full max-w-md bg-secondary/50 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-sm mb-2">Extracted Measurements:</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(parsedData).map(([key, value]) => (
                        <div key={key} className="text-xs">
                          <span className="text-muted-foreground capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}:
                          </span>{' '}
                          <span className="font-medium">{renderMeasurementValue(key, value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-4">
                  <Button onClick={saveToDatabase}>
                    Save Measurements
                  </Button>
                  <Button variant="outline" onClick={resetUpload}>
                    Upload Another
                  </Button>
                </div>
              </>
            )}
            
            {status === "error" && (
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
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
