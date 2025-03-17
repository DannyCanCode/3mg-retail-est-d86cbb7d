import React, { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MeasurementValues } from "./types";

interface LengthMeasurementsTabProps {
  measurements: MeasurementValues;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  goToPreviousTab: () => void;
  goToNextTab: () => void;
}

export function LengthMeasurementsTab({
  measurements,
  handleInputChange,
  goToPreviousTab,
  goToNextTab,
}: LengthMeasurementsTabProps) {
  // Debug log when measurements change
  useEffect(() => {
    console.log("CRITICAL: LengthMeasurementsTab - Measurements received:", measurements);
    console.log("CRITICAL: LengthMeasurementsTab - Length values:", {
      ridgeLength: measurements.ridgeLength,
      hipLength: measurements.hipLength,
      valleyLength: measurements.valleyLength,
      rakeLength: measurements.rakeLength,
      eaveLength: measurements.eaveLength,
      stepFlashingLength: measurements.stepFlashingLength,
      flashingLength: measurements.flashingLength,
    });
    console.log("CRITICAL: LengthMeasurementsTab - Value types:", {
      ridgeLength: typeof measurements.ridgeLength,
      hipLength: typeof measurements.hipLength,
      valleyLength: typeof measurements.valleyLength,
      rakeLength: typeof measurements.rakeLength,
      eaveLength: typeof measurements.eaveLength,
      stepFlashingLength: typeof measurements.stepFlashingLength,
      flashingLength: typeof measurements.flashingLength,
    });
  }, [measurements]);

  // Helper function to format value display
  const formatValueForInput = (value: number | undefined): string => {
    if (value === undefined || value === null) return "";
    if (value === 0) return "0";
    return value.toString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Length Measurements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="ridgeLength">Ridge Length (ft)</Label>
            <Input
              id="ridgeLength"
              name="ridgeLength"
              type="number"
              value={String(measurements.ridgeLength || '')}
              onChange={handleInputChange}
              placeholder="Enter ridge length"
              data-testid="ridge-length-input"
            />
            <p className="text-sm text-muted-foreground">
              The total length of all ridges
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="hipLength">Hip Length (ft)</Label>
            <Input
              id="hipLength"
              name="hipLength"
              type="number"
              value={String(measurements.hipLength || '')}
              onChange={handleInputChange}
              placeholder="Enter hip length"
              data-testid="hip-length-input"
            />
            <p className="text-sm text-muted-foreground">
              The total length of all hip ridges
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="valleyLength">Valley Length (ft)</Label>
            <Input
              id="valleyLength"
              name="valleyLength"
              type="number"
              value={String(measurements.valleyLength || '')}
              onChange={handleInputChange}
              placeholder="Enter valley length"
              data-testid="valley-length-input"
            />
            <p className="text-sm text-muted-foreground">
              The total length of all valleys
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="eaveLength">Eave Length (ft)</Label>
            <Input
              id="eaveLength"
              name="eaveLength"
              type="number"
              value={String(measurements.eaveLength || '')}
              onChange={handleInputChange}
              placeholder="Enter eave length"
              data-testid="eave-length-input"
            />
            <p className="text-sm text-muted-foreground">
              The total length of all eaves
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="rakeLength">Rake Length (ft)</Label>
            <Input
              id="rakeLength"
              name="rakeLength"
              type="number"
              value={String(measurements.rakeLength || '')}
              onChange={handleInputChange}
              placeholder="Enter rake length"
              data-testid="rake-length-input"
            />
            <p className="text-sm text-muted-foreground">
              The total length of all rake edges
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="stepFlashingLength">Step Flashing Length (ft)</Label>
            <Input
              id="stepFlashingLength"
              name="stepFlashingLength"
              type="number"
              value={String(measurements.stepFlashingLength || '')}
              onChange={handleInputChange}
              placeholder="Enter step flashing length"
              data-testid="step-flashing-length-input"
            />
            <p className="text-sm text-muted-foreground">
              The total length of step flashing
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="flashingLength">Wall Flashing Length (ft)</Label>
            <Input
              id="flashingLength"
              name="flashingLength"
              type="number"
              value={String(measurements.flashingLength || '')}
              onChange={handleInputChange}
              placeholder="Enter wall flashing length"
              data-testid="wall-flashing-length-input"
            />
            <p className="text-sm text-muted-foreground">
              The total length of wall flashing
            </p>
          </div>
        </div>
        
        <div className="px-4 py-3 bg-secondary/30 rounded-md">
          <p className="text-sm text-muted-foreground">
            <strong>Tip:</strong> Accurate length measurements are essential for calculating quantities for ridges, hips, valleys, and edges. These lengths determine how much material you'll need for these areas.
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
          type="button" 
          onClick={goToNextTab}
          className="flex items-center gap-2"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
