import React from "react";
import { useFileUpload } from "./hooks/useFileUpload";
import { usePdfParser } from "./hooks/usePdfParser";
import { useMeasurementStorage } from "./hooks/useMeasurementStorage";
import { DropZone } from "./DropZone";
import { ProcessingStatus } from "./ProcessingStatus";
import { SuccessStatus } from "./SuccessStatus";
import { ErrorStatus } from "./ErrorStatus";
import { toast } from "@/hooks/use-toast";
import { ParsedMeasurements } from "@/api/measurements";

// Add the onPdfParsed prop to the component props
interface PdfUploaderProps {
  onPdfParsed?: (data: ParsedMeasurements, fileName: string) => void;
}

export function PdfUploader({ onPdfParsed }: PdfUploaderProps) {
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
      } else if (result && onPdfParsed && status === "success") {
        // If we have a result and the onPdfParsed callback, call it
        onPdfParsed(result, selectedFile.name);
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
      await saveToDatabase(file.name, parsedData, fileUrl || undefined);
      
      // After saving to database, also notify parent if onPdfParsed is provided
      if (onPdfParsed) {
        onPdfParsed(parsedData, file.name);
      }
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

  return (
    <div className="w-full">
      {status === "idle" ? (
        <div className="flex flex-col gap-4">
          <DropZone 
            dragActive={dragActive}
            handleDrag={handleDrag}
            handleDrop={handleDropWrapper}
            handleFileInput={handleFileInputWrapper}
          />
        </div>
      ) : (
        <div className="p-8 flex flex-col items-center justify-center">
          {(status === "uploading" || status === "parsing") && (
            <ProcessingStatus 
              status={status} 
              fileName={file?.name || ""} 
              processingMode={processingMode}
              progress={processingProgress}
            />
          )}
          
          {status === "success" && parsedData && (
            <SuccessStatus 
              fileName={file?.name || ""} 
              parsedData={parsedData}
              fileUrl={fileUrl}
              saveToDatabase={handleSaveToDatabase}
              resetUpload={handleResetUpload}
            />
          )}
          
          {status === "error" && (
            <ErrorStatus 
              resetUpload={handleResetUpload} 
              errorDetails={errorDetails}
            />
          )}
        </div>
      )}
    </div>
  );
}
