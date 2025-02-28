
import React from "react";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ParsedMeasurements } from "@/api/measurements";
import { renderMeasurementValue } from "./pdf-utils";
import { Separator } from "@/components/ui/separator";

interface SuccessStatusProps {
  fileName: string;
  parsedData: ParsedMeasurements;
  saveToDatabase: () => Promise<void>;
  resetUpload: () => void;
}

export function SuccessStatus({ fileName, parsedData, saveToDatabase, resetUpload }: SuccessStatusProps) {
  // Filter and group fields for better display
  const getTotalFields = () => {
    return Object.entries(parsedData).filter(([key]) => 
      key.includes('total') || key.includes('Total') || key === 'penetrationsArea' || key === 'penetrationsPerimeter' || key === 'predominantPitch' || key === 'roofPitch'
    );
  };
  
  const getLengthFields = () => {
    return Object.entries(parsedData).filter(([key]) => 
      key.includes('Length') && !key.includes('Count')
    );
  };
  
  const getCountFields = () => {
    return Object.entries(parsedData).filter(([key]) => 
      key.includes('Count')
    );
  };
  
  return (
    <>
      <div className="p-4 rounded-full bg-[#10b981]/10 mb-4">
        <CheckCircle className="h-8 w-8 text-[#10b981]" />
      </div>
      <h3 className="text-lg font-medium mb-1">Parsing Complete</h3>
      <p className="text-muted-foreground text-sm mb-4 text-center">
        {fileName} has been processed successfully
      </p>
      
      <div className="w-full max-w-md bg-secondary/50 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-sm mb-2">Extracted Measurements:</h4>
        
        <div className="mb-3">
          <h5 className="text-xs text-muted-foreground mb-1">Total Area & Pitch</h5>
          <div className="grid grid-cols-2 gap-2">
            {getTotalFields().map(([key, value]) => (
              <div key={key} className="text-xs">
                <span className="text-muted-foreground capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                </span>{' '}
                <span className="font-medium">{renderMeasurementValue(key, value)}</span>
              </div>
            ))}
          </div>
        </div>
        
        <Separator className="my-2" />
        
        <div className="mb-3">
          <h5 className="text-xs text-muted-foreground mb-1">Length Measurements</h5>
          <div className="grid grid-cols-2 gap-2">
            {getLengthFields().map(([key, value]) => (
              <div key={key} className="text-xs">
                <span className="text-muted-foreground capitalize">
                  {key.replace(/Length|([A-Z])/g, (match, p1) => p1 ? ' ' + p1 : '').trim()}:
                </span>{' '}
                <span className="font-medium">{renderMeasurementValue(key, parsedData)}</span>
              </div>
            ))}
          </div>
        </div>
        
        <Separator className="my-2" />
        
        <div>
          <h5 className="text-xs text-muted-foreground mb-1">Count Information</h5>
          <div className="grid grid-cols-2 gap-2">
            {getCountFields().map(([key, value]) => (
              <div key={key} className="text-xs">
                <span className="text-muted-foreground capitalize">
                  {key.replace(/Count|([A-Z])/g, (match, p1) => p1 ? ' ' + p1 : '').trim() + ' Count'}:
                </span>{' '}
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex gap-4">
        <Button onClick={saveToDatabase}>
          Save Measurements
        </Button>
        <Button variant="outline" onClick={resetUpload}>
          Upload Another
        </Button>
      </div>
    </>
  );
}
