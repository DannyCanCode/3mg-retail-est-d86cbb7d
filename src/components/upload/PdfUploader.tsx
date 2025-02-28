
import React, { useCallback } from "react";
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

  const { parsedData, setParsedData, parsePdf } = usePdfParser();
  const { saveToDatabase } = useMeasurementStorage();

  const handleFiles = useCallback((files: FileList) => {
    if (files.length > 0) {
      const selectedFile = files[0];
      if (selectedFile.type.includes("pdf")) {
        uploadAndProcess(selectedFile);
      }
    }
  }, []);

  const uploadAndProcess = async (selectedFile: File) => {
    if (!selectedFile) return;
    
    try {
      await parsePdf(selectedFile, setStatus, setErrorDetails);
    } catch (error) {
      console.error("Error in upload and process flow:", error);
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
