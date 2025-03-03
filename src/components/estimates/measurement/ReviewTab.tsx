
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MeasurementValues } from "./types";

interface ReviewTabProps {
  measurements: MeasurementValues;
  isSubmitting: boolean;
  goToPreviousTab: () => void;
}

export function ReviewTab({
  measurements,
  isSubmitting,
  goToPreviousTab,
}: ReviewTabProps) {
  // Calculate totals
  const totalSquares = Math.round(measurements.totalArea / 100 * 10) / 10;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Measurements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Area Measurements</h3>
            
            <div className="grid grid-cols-2 gap-y-2">
              <div className="text-sm text-muted-foreground">Total Roof Area:</div>
              <div className="text-sm font-medium">
                {measurements.totalArea.toLocaleString()} sq ft 
                <Badge variant="secondary" className="ml-2">{totalSquares} squares</Badge>
              </div>
              
              <div className="text-sm text-muted-foreground">Predominant Pitch:</div>
              <div className="text-sm font-medium">{measurements.roofPitch}</div>
              
              <div className="text-sm text-muted-foreground">Penetrations Area:</div>
              <div className="text-sm font-medium">{measurements.penetrationsArea.toLocaleString()} sq ft</div>
            </div>
            
            <h4 className="text-md font-semibold pt-2">Areas by Pitch</h4>
            <div className="space-y-1">
              {measurements.areasByPitch.map((area, index) => (
                <div key={index} className="grid grid-cols-3 gap-2 text-sm">
                  <div>{area.pitch} pitch:</div>
                  <div>{area.area.toLocaleString()} sq ft</div>
                  <div>{area.percentage}% of roof</div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Length Measurements</h3>
            
            <div className="grid grid-cols-2 gap-y-2">
              <div className="text-sm text-muted-foreground">Ridge Length:</div>
              <div className="text-sm font-medium">{measurements.ridgeLength} ft</div>
              
              <div className="text-sm text-muted-foreground">Hip Length:</div>
              <div className="text-sm font-medium">{measurements.hipLength} ft</div>
              
              <div className="text-sm text-muted-foreground">Valley Length:</div>
              <div className="text-sm font-medium">{measurements.valleyLength} ft</div>
              
              <div className="text-sm text-muted-foreground">Eave Length:</div>
              <div className="text-sm font-medium">{measurements.eaveLength} ft</div>
              
              <div className="text-sm text-muted-foreground">Rake Length:</div>
              <div className="text-sm font-medium">{measurements.rakeLength} ft</div>
              
              <div className="text-sm text-muted-foreground">Step Flashing Length:</div>
              <div className="text-sm font-medium">{measurements.stepFlashingLength} ft</div>
              
              <div className="text-sm text-muted-foreground">Wall Flashing Length:</div>
              <div className="text-sm font-medium">{measurements.flashingLength} ft</div>
            </div>
          </div>
        </div>
        
        <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> These measurements will be used to calculate material quantities. Please review carefully before submitting.
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          type="button" 
          variant="outline"
          onClick={goToPreviousTab}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Save Measurements"}
        </Button>
      </CardFooter>
    </Card>
  );
}
