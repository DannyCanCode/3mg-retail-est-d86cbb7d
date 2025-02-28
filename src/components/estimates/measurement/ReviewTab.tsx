
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Save } from "lucide-react";
import { AreaByPitch } from "./types";

interface ReviewTabProps {
  measurements: {
    totalArea: number;
    roofPitch: string;
    penetrationsArea: number;
    ridgeLength: number;
    hipLength: number;
    valleyLength: number;
    eaveLength: number;
    rakeLength: number;
    stepFlashingLength: number;
    flashingLength: number;
    areasByPitch: AreaByPitch[];
  };
  isSubmitting: boolean;
  goToPreviousTab: () => void;
}

export function ReviewTab({
  measurements,
  isSubmitting,
  goToPreviousTab,
}: ReviewTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Measurements</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Roof Area</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm text-muted-foreground">Total Area:</div>
              <div className="text-sm font-medium">{measurements.totalArea} sq ft</div>
              
              <div className="text-sm text-muted-foreground">Roof Squares:</div>
              <div className="text-sm font-medium">{Math.ceil(measurements.totalArea / 100)} squares</div>
              
              <div className="text-sm text-muted-foreground">Predominant Pitch:</div>
              <div className="text-sm font-medium">{measurements.roofPitch}</div>
              
              <div className="text-sm text-muted-foreground">Penetrations Area:</div>
              <div className="text-sm font-medium">{measurements.penetrationsArea} sq ft</div>
            </div>
            
            {measurements.areasByPitch.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-base mb-2">Areas by Pitch</h4>
                <div className="space-y-2">
                  {measurements.areasByPitch.map((area, index) => (
                    <div key={index} className="grid grid-cols-3 gap-2">
                      <div className="text-sm font-medium">{area.pitch}</div>
                      <div className="text-sm">{area.area} sq ft</div>
                      <div className="text-sm">{area.percentage}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Length Measurements</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm text-muted-foreground">Ridge:</div>
              <div className="text-sm font-medium">{measurements.ridgeLength} ft</div>
              
              <div className="text-sm text-muted-foreground">Hip:</div>
              <div className="text-sm font-medium">{measurements.hipLength} ft</div>
              
              <div className="text-sm text-muted-foreground">Valley:</div>
              <div className="text-sm font-medium">{measurements.valleyLength} ft</div>
              
              <div className="text-sm text-muted-foreground">Eave:</div>
              <div className="text-sm font-medium">{measurements.eaveLength} ft</div>
              
              <div className="text-sm text-muted-foreground">Rake:</div>
              <div className="text-sm font-medium">{measurements.rakeLength} ft</div>
              
              <div className="text-sm text-muted-foreground">Step Flashing:</div>
              <div className="text-sm font-medium">{measurements.stepFlashingLength} ft</div>
              
              <div className="text-sm text-muted-foreground">Flashing:</div>
              <div className="text-sm font-medium">{measurements.flashingLength} ft</div>
            </div>
          </div>
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
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {isSubmitting ? "Saving..." : "Save Measurements"}
        </Button>
      </CardFooter>
    </Card>
  );
}
