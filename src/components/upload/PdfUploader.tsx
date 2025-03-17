import React, { useEffect } from "react";
import { useFileUpload } from "./hooks/useFileUpload";
import { usePdfParser } from "./hooks/usePdfParser";
import { useMeasurementStorage } from "./hooks/useMeasurementStorage";
import { DropZone } from "./DropZone";
import { ParsedMeasurements } from "@/api/measurements";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { FileUploadStatus } from "./hooks/useFileUpload";

interface PdfUploaderProps {
  onDataExtracted?: (data: ParsedMeasurements, fileName: string) => void;
  savedFileName?: string;
}

export function PdfUploader({ onDataExtracted, savedFileName }: PdfUploaderProps) {
  const { 
    file, 
    status, 
    setStatus, 
    dragActive, 
    errorDetails, 
    setErrorDetails, 
    handleDrag, 
    handleDrop, 
    handleFileInput, 
    resetUpload 
  } = useFileUpload();

  const { 
    parsedData, 
    setParsedData, 
    parsePdf, 
    processingMode,
    processingProgress,
    fileUrl
  } = usePdfParser();
  
  const { saveToDatabase } = useMeasurementStorage();

  const uploadAndProcess = async (selectedFile: File) => {
    if (!selectedFile) return;
    
    try {
      // Display the processing mode that will be used
      console.log(`Processing file using ${processingMode} mode`);
      
      // Clear previous error
      setErrorDetails("");
      
      const result = await parsePdf(selectedFile, setStatus, setErrorDetails);
      
      if (!result && status !== "error") {
        // If no result but no error was set, set a generic error
        setStatus("error");
        setErrorDetails("Failed to process the PDF. Please try a different file.");
        toast({
          title: "Processing failed",
          description: "There was an unexpected error processing your file.",
          variant: "destructive",
        });
      } else if (result && onDataExtracted) {
        // If we have a result and the parent component provided the onDataExtracted callback
        onDataExtracted(result, selectedFile.name);
      }
    } catch (error) {
      console.error("Error in upload and process flow:", error);
      setStatus("error");
      setErrorDetails(error instanceof Error ? error.message : "Unknown error occurred");
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleSaveToDatabase = async () => {
    if (!parsedData || !file) return;
    
    try {
      // Call the onDataExtracted callback if provided
      if (onDataExtracted) {
        onDataExtracted(parsedData, file.name);
      }
      
      await saveToDatabase(file.name, parsedData, fileUrl || undefined);
    } catch (error) {
      console.error("Error saving to database:", error);
      toast({
        title: "Save failed",
        description: "Failed to save measurements to database. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleResetUpload = () => {
    resetUpload();
    setParsedData(null);
  };

  const handleFileInputWrapper = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      console.log("File selected:", file.name, file.size);
      handleFileInput(e);
      uploadAndProcess(file);
    } else {
      console.log("No file selected");
    }
  };

  const handleDropWrapper = (e: React.DragEvent) => {
    const file = handleDrop(e);
    if (file) {
      console.log("File dropped:", file.name, file.size);
      uploadAndProcess(file);
    } else {
      console.log("No file dropped or invalid file");
    }
  };

  const handleBrowseClick = () => {
    // Create and trigger a file input to replicate the browse functionality
    const fileInput = document.getElementById("pdf-upload") as HTMLInputElement;
    if (fileInput) {
      console.log("Triggering file input browse");
      fileInput.click();
    } else {
      console.error("Could not find file input element");
    }
  };

  // If we have a savedFileName, display it as already processed
  useEffect(() => {
    if (savedFileName && !file && !parsedData) {
      console.log("Using saved file name:", savedFileName);
      // Create a dummy file object with the savedFileName
      const dummyFile = new File(["dummy content"], savedFileName, { type: "application/pdf" });
      // Set the file but don't reprocess it - we already have the data
      setStatus("success");
    }
  }, [savedFileName, file, parsedData, setStatus]);

  return (
    <div className="space-y-4">
      {/* Display different content based on the current status */}
      {status === "idle" && (
        <>
          <DropZone 
            dragActive={dragActive}
            handleDrag={handleDrag}
            handleDrop={handleDropWrapper}
            handleFileInput={handleFileInputWrapper}
          />
          <div className="mt-4 flex justify-center">
            <Button 
              onClick={handleBrowseClick}
              className="flex items-center"
            >
              Upload PDF
            </Button>
          </div>
        </>
      )}

      {status === "parsing" && processingProgress && (
        <div className="border-2 border-dashed rounded-lg p-8">
          <h3 className="text-lg font-medium mb-4 text-center">Processing PDF</h3>
          <div className="space-y-2">
            <p className="text-center text-sm">
              {processingProgress.status || "Processing..."}
            </p>
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
              <div 
                className="bg-primary h-full transition-all" 
                style={{ 
                  width: processingProgress.totalPages > 0 
                    ? `${(processingProgress.page / processingProgress.totalPages) * 100}%` 
                    : "10%" 
                }}
              />
            </div>
          </div>
        </div>
      )}

      {status === "success" && parsedData && (
        <div className="border-2 border-dashed rounded-lg p-8">
          <div className="text-center mb-6">
            <div className="mx-auto bg-green-100 rounded-full p-3 w-fit mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-medium">Successfully processed {file?.name || savedFileName}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              We've successfully extracted the following measurements from your PDF
            </p>
          </div>
          
          <div className="space-y-4">
            <Button onClick={handleSaveToDatabase} className="w-full">
              Save to Database
            </Button>
            <Button variant="outline" onClick={handleResetUpload} className="w-full">
              Upload another file
            </Button>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="border-2 border-dashed border-destructive rounded-lg p-8">
          <div className="text-center mb-6">
            <div className="mx-auto bg-red-100 rounded-full p-3 w-fit mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-medium">Error processing file</h3>
            <p className="text-sm text-red-600 mt-1">
              {errorDetails || "There was a problem processing your PDF file."}
            </p>
          </div>
          
          <Button variant="outline" onClick={handleResetUpload} className="w-full">
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
