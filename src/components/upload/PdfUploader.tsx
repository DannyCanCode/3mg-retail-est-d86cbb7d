import React, { useEffect, useState } from "react";
import { useFileUpload } from "./hooks/useFileUpload";
import { usePdfParser } from "./hooks/usePdfParser";
import { useMeasurementStorage } from "./hooks/useMeasurementStorage";
import { DropZone } from "./DropZone";
import { ParsedMeasurements } from "@/api/measurements";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { FileUploadStatus } from "./hooks/useFileUpload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { renderMeasurementValue } from "./pdf-utils";
import { Loader2, CheckCircle2, ExternalLink, RotateCcw, Save } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { MeasurementDisplay } from "@/components/measurements/MeasurementDisplay";

interface PdfUploaderProps {
  onDataExtracted?: (data: ParsedMeasurements, fileName: string, fileUrl?: string | null) => void;
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
    parsePdf, 
    processingMode,
    processingProgress,
    fileUrl,
    isProcessing
  } = usePdfParser();
  
  // Local state for parsed data management - REMOVED: Not needed
  
  const { saveToDatabase } = useMeasurementStorage();
  
  // Add save state management
  const [saveState, setSaveState] = React.useState<'idle' | 'saving' | 'success' | 'error'>('idle');

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
        // Extract the parsedMeasurements from the result object and pass the fileUrl from the result
        console.log("🔍 [PdfUploader] Calling onDataExtracted with fileUrl:", result.fileUrl || "NULL");
        onDataExtracted(result.parsedMeasurements, selectedFile.name, result.fileUrl);
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
      setSaveState('saving');
      
      // Call the onDataExtracted callback if provided
      if (onDataExtracted) {
        onDataExtracted(parsedData, file.name, fileUrl);
      }
      
      const result = await saveToDatabase(file.name, parsedData, fileUrl || undefined);
      
      if (result) {
        setSaveState('success');
        toast({
          title: "Success!",
          description: "Measurements saved successfully and redirecting to estimates.",
        });
        
        // Reset to idle after a delay to show success state
        setTimeout(() => {
          setSaveState('idle');
        }, 2000);
      } else {
        throw new Error("Save operation returned null");
      }
    } catch (error) {
      console.error("Error saving to database:", error);
      setSaveState('error');
      toast({
        title: "Save failed",
        description: "Failed to save measurements to database. Please try again.",
        variant: "destructive",
      });
      
      // Reset to idle after showing error
      setTimeout(() => {
        setSaveState('idle');
      }, 3000);
    }
  };

  const handleResetUpload = () => {
    resetUpload();
    // setParsedData is not available - this is handled by the usePdfParser hook internally
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

  // Process component - Display content when file is being processed
  function ProcessingStatus({ file, progress }: { file: File, progress: any }) {
    return (
      <div className="w-full flex flex-col items-center p-4">
        <div className="mb-4 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Processing <span className="font-medium">{file.name}</span>
          </p>
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {progress?.status || "Processing PDF..."}
              {progress?.page && progress?.totalPages && (
                <span> ({progress.page}/{progress.totalPages})</span>
              )}
            </p>
          </div>
        </div>
        <Progress value={progress?.page && progress?.totalPages ? (progress.page / progress.totalPages) * 100 : 0} className="w-full max-w-xs" />
      </div>
    );
  }

  // Success component - Display content when file is successfully processed
  function SuccessStatus({ 
    file, 
    parsedData, 
    onSave, 
    fileUrl 
  }: { 
    file: File, 
    parsedData: ParsedMeasurements, 
    onSave?: () => void, 
    fileUrl?: string | null
  }) {
    return (
      <div className="w-full">
        <Card className="overflow-hidden">
          <CardHeader className="bg-green-50 dark:bg-green-950/30 pb-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <CardTitle className="text-base font-medium">PDF processed successfully</CardTitle>
              </div>
              {fileUrl && (
                <a 
                  href={fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View PDF
                </a>
              )}
            </div>
            <CardDescription className="pt-1 text-sm">
              <code className="text-xs text-muted-foreground">{file.name}</code>
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium mb-2">Extracted Measurements</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  We've successfully extracted the following measurements from your PDF.
                </p>
              </div>
              
              <MeasurementDisplay measurements={parsedData} />
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between pt-4 pb-4 border-t bg-muted/20">
            <Button variant="secondary" onClick={() => {
              handleResetUpload();
              // Notify parent component to clear the data
              if (onDataExtracted) {
                onDataExtracted(null as any, "", "");
              }
              // Force a component reset
              setStatus("idle");
            }}>
              <RotateCcw className="h-4 w-4 mr-2" /> Upload Another
            </Button>
            
            {onSave && (
              <Button 
                onClick={onSave} 
                disabled={saveState === 'saving'}
                className={
                  saveState === 'success' 
                    ? 'bg-green-600 hover:bg-green-700 border-green-600' 
                    : saveState === 'error'
                    ? 'bg-red-600 hover:bg-red-700 border-red-600'
                    : ''
                }
              >
                {saveState === 'saving' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                  </>
                ) : saveState === 'success' ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Saved Successfully!
                  </>
                ) : saveState === 'error' ? (
                  <>
                    <Save className="h-4 w-4 mr-2" /> Retry Save
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" /> Save Measurements
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }

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
              className="flex items-center bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25"
            >
              Upload PDF
            </Button>
          </div>
        </>
      )}

      {status === "parsing" && processingProgress && (
        <ProcessingStatus file={file} progress={processingProgress} />
      )}

      {status === "success" && parsedData && (
        <SuccessStatus 
          file={file} 
          parsedData={parsedData} 
          onSave={handleSaveToDatabase} 
          fileUrl={fileUrl} 
        />
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
