import React from "react";
import { useFileUpload } from "./hooks/useFileUpload";
import { usePdfParser } from "./hooks/usePdfParser";
import { useMeasurementStorage } from "./hooks/useMeasurementStorage";
import { DropZone } from "./DropZone";
import { ProcessingStatus } from "./ProcessingStatus";
import { SuccessStatus } from "./SuccessStatus";
import { ErrorStatus } from "./ErrorStatus";
import { ParsedMeasurements } from "@/api/measurements";
import { toast } from "@/hooks/use-toast";

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
    handleFileInput(e);
    if (e.target.files && e.target.files.length > 0) {
      uploadAndProcess(e.target.files[0]);
    }
  };

  const handleDropWrapper = (e: React.DragEvent) => {
    const file = handleDrop(e);
    if (file) {
      uploadAndProcess(file);
    }
  };

  // If we have a savedFileName, display it as already processed
  React.useEffect(() => {
    if (savedFileName && !file && !parsedData) {
      console.log("Using saved file name:", savedFileName);
      // Create a dummy file object with the savedFileName
      const dummyFile = new File(["dummy content"], savedFileName, { type: "application/pdf" });
      // Set the file but don't reprocess it - we already have the data
      setStatus("success");
    }
  }, [savedFileName, file, parsedData]);

  return (
    <div className="space-y-4">
      {/* Display different content based on the current status */}
      {status === "idle" && (
        <DropZone 
          onDrop={handleDropWrapper}
          onDragOver={handleDrag}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onFileInputChange={handleFileInputWrapper}
          dragActive={dragActive}
        />
      )}

      {status === "processing" && (
        <ProcessingStatus 
          file={file}
          mode={processingMode}
          progress={processingProgress}
        />
      )}

      {status === "success" && parsedData && (
        <SuccessStatus 
          file={file || (savedFileName ? new File(["dummy content"], savedFileName, { type: "application/pdf" }) : undefined)}
          parsedData={parsedData}
          fileUrl={fileUrl}
          onSaveToDatabase={handleSaveToDatabase}
          onReset={handleResetUpload}
        />
      )}

      {status === "error" && (
        <ErrorStatus 
          file={file}
          errorDetails={errorDetails}
          onReset={handleResetUpload}
        />
      )}
    </div>
  );
}
