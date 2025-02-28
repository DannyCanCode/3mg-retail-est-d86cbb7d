
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { saveMeasurement, ParsedMeasurements } from "@/api/measurements";
import { useNavigate } from "react-router-dom";
import { readFileAsBase64 } from "./pdf-utils";
import { DropZone } from "./DropZone";
import { ProcessingStatus } from "./ProcessingStatus";
import { SuccessStatus } from "./SuccessStatus";
import { ErrorStatus } from "./ErrorStatus";
import { supabase } from "@/integrations/supabase/client";

type UploadStatus = "idle" | "uploading" | "parsing" | "success" | "error";

export function PdfUploader() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [parsedData, setParsedData] = useState<ParsedMeasurements | null>(null);
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
    setErrorDetails("");
    
    try {
      // First, read the file as base64
      const base64File = await readFileAsBase64(file);
      setStatus("parsing");
      
      // Call the edge function to parse the PDF
      try {
        const { data, error } = await supabase.functions.invoke('parse-eagleview-pdf', {
          body: { 
            fileName: file.name,
            pdfBase64: base64File 
          }
        });
        
        if (error) {
          console.error("Supabase function error:", error);
          setErrorDetails(`Error: ${error.message}`);
          throw error;
        }
        
        if (!data || !data.measurements) {
          setErrorDetails("The parsing service returned invalid data");
          throw new Error("Invalid response data");
        }
        
        // Store the parsed measurements
        setParsedData(data.measurements);
        
        setStatus("success");
        toast({
          title: "Parsing successful",
          description: `${file.name} has been processed.`,
        });
      } catch (functionError: any) {
        console.error("Edge function error:", functionError);
        
        // Check if it's a connection error
        if (functionError.message && functionError.message.includes("Failed to send a request")) {
          setErrorDetails("Connection to Edge Function failed. This might be due to a temporary network issue or the function is still being deployed. Please try again in a moment.");
        } else {
          setErrorDetails(functionError.message || "Unknown edge function error");
        }
        
        setStatus("error");
        throw functionError;
      }
    } catch (error: any) {
      console.error("Error parsing PDF:", error);
      setStatus("error");
      if (!errorDetails) {
        setErrorDetails(error.message || "Unknown error occurred");
      }
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
    setErrorDetails("");
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
      
      // Navigate to create estimate page with measurement ID
      if (data) {
        // Navigate to create estimate page with measurement ID
        navigate(`/estimates?measurementId=${data.id}`);
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
    <div className="w-full">
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
            <ErrorStatus 
              resetUpload={resetUpload} 
              errorDetails={errorDetails}
            />
          )}
        </div>
      )}
    </div>
  );
}
