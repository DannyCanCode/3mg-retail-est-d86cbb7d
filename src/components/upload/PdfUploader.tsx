
import React from "react";
import { useFileUpload } from "./hooks/useFileUpload";
import { usePdfParser } from "./hooks/usePdfParser";
import { useMeasurementStorage } from "./hooks/useMeasurementStorage";
import { DropZone } from "./DropZone";
import { ProcessingStatus } from "./ProcessingStatus";
import { SuccessStatus } from "./SuccessStatus";
import { ErrorStatus } from "./ErrorStatus";

export function PdfUploader() {
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

  const { parsedData, setParsedData, parsePdf, processingMode } = usePdfParser();
  const { saveToDatabase } = useMeasurementStorage();

  const uploadAndProcess = async (selectedFile: File) => {
    if (!selectedFile) return;
    
    try {
      // Display the processing mode that will be used
      console.log(`Processing file using ${processingMode} mode`);
      
      await parsePdf(selectedFile, setStatus, setErrorDetails);
    } catch (error) {
      console.error("Error in upload and process flow:", error);
      setStatus("error");
      setErrorDetails(error instanceof Error ? error.message : "Unknown error occurred");
    }
  };

  const handleSaveToDatabase = async () => {
    if (!parsedData || !file) return;
    await saveToDatabase(file.name, parsedData);
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
        <DropZone 
          dragActive={dragActive}
          handleDrag={handleDrag}
          handleDrop={handleDropWrapper}
          handleFileInput={handleFileInputWrapper}
        />
      ) : (
        <div className="p-8 flex flex-col items-center justify-center">
          {(status === "uploading" || status === "parsing") && (
            <ProcessingStatus 
              status={status} 
              fileName={file?.name || ""} 
              processingMode={processingMode}
            />
          )}
          
          {status === "success" && parsedData && (
            <SuccessStatus 
              fileName={file?.name || ""} 
              parsedData={parsedData}
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
