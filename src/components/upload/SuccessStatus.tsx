import React from "react";
import { CheckCircle, Download, FileText, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ParsedMeasurements } from "@/api/measurements";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { renderMeasurementValue } from "./pdf-utils";

export interface SuccessStatusProps {
  fileName: string;
  parsedData: ParsedMeasurements;
  fileUrl?: string | null;
  saveToDatabase: () => Promise<void>;
  resetUpload: () => void;
}

export function SuccessStatus({ 
  fileName, 
  parsedData, 
  fileUrl, 
  saveToDatabase, 
  resetUpload 
}: SuccessStatusProps) {
  const handleViewOriginal = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  return (
    <>
      <div className="p-4 rounded-full bg-green-100 dark:bg-green-900 mb-4">
        <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-300" />
      </div>
      <h3 className="text-lg font-medium mb-1">Successfully processed {fileName}</h3>
      <p className="text-muted-foreground text-sm mb-6 text-center">
        We've successfully extracted the following measurements from your PDF
      </p>
      
      <Card className="w-full max-w-2xl mb-6">
        <CardHeader>
          <CardTitle>Extracted Measurements</CardTitle>
          <CardDescription>
            These values will be used in your estimate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(parsedData).map(([key, value]) => {
              // Skip objects like areasByPitch for now
              if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                return null;
              }
              
              return (
                <div key={key} className="flex justify-between gap-2 py-1 border-b">
                  <span className="font-medium">
                    {key.replace(/([A-Z])/g, ' $1').trim()}:
                  </span>
                  <span className="text-right">
                    {renderMeasurementValue(key, value)}
                  </span>
                </div>
              );
            })}
          </div>
          
          {/* Show areas by pitch if available */}
          {parsedData.areasByPitch && parsedData.areasByPitch.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Areas by Pitch:</h4>
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Roof Pitch
                      </th>
                      <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Area (sq ft)
                      </th>
                      <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        % of Roof
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {parsedData.areasByPitch.map((area) => (
                      <tr key={area.pitch} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                          {area.pitch}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                          {area.area.toFixed(1)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                          {area.percentage.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="flex flex-wrap gap-3 justify-center">
        <Button onClick={saveToDatabase} className="gap-2">
          <Save className="h-4 w-4" />
          Save to Database
        </Button>
        
        {fileUrl && (
          <Button variant="outline" onClick={handleViewOriginal} className="gap-2">
            <FileText className="h-4 w-4" />
            View Original PDF
          </Button>
        )}
        
        <Button variant="outline" onClick={resetUpload} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Upload Another
        </Button>
      </div>
    </>
  );
}
