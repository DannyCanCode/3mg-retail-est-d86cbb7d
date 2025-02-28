
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { saveMeasurement, ParsedMeasurements } from "@/api/measurements";
import { useNavigate } from "react-router-dom";
import { readFileAsBase64 } from "./pdf-utils";
import { DropZone } from "./DropZone";
import { ProcessingStatus } from "./ProcessingStatus";
import { SuccessStatus } from "./SuccessStatus";
import { ErrorStatus } from "./ErrorStatus";

type UploadStatus = "idle" | "uploading" | "parsing" | "success" | "error";

export function PdfUploader() {
  const navigate = useNavigate();
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

  const resetUpload = () => {
    setFile(null);
    setStatus("idle");
    setParsedData(null);
  };

  const saveToDatabase = async () => {
    if (!parsedData || !file) return;

    try {
      const { data, error } = await saveMeasurement(file.name, parsedData);
      
      if (error) {
        throw error;
      }

      toast({
        title: "Measurements saved",
        description: "Measurements have been saved to the database.",
      });
      
      // Optionally, redirect to create a new estimate with these measurements
      if (data) {
        // Navigate to create estimate page with measurement ID
        // navigate(`/estimates/new?measurementId=${data.id}`);
        
        // For now, just show a success message
        toast({
          title: "Success",
          description: "Your measurements are ready to use in an estimate.",
        });
      }
    } catch (error) {
      console.error("Error saving measurements:", error);
      toast({
        title: "Save failed",
        description: "Failed to save measurements to database.",
        variant: "destructive",
      });
    }
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
          <DropZone 
            dragActive={dragActive}
            handleDrag={handleDrag}
            handleDrop={handleDrop}
            handleFileInput={handleFileInput}
          />
        ) : (
          <div className="p-8 flex flex-col items-center justify-center">
            {(status === "uploading" || status === "parsing") && (
              <ProcessingStatus 
                status={status} 
                fileName={file?.name || ""} 
              />
            )}
            
            {status === "success" && parsedData && (
              <SuccessStatus 
                fileName={file?.name || ""} 
                parsedData={parsedData}
                saveToDatabase={saveToDatabase}
                resetUpload={resetUpload}
              />
            )}
            
            {status === "error" && (
              <ErrorStatus resetUpload={resetUpload} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
