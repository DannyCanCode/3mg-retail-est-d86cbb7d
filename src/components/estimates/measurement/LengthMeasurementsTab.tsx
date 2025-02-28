
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface LengthMeasurementsTabProps {
  measurements: {
    ridgeLength: number;
    hipLength: number;
    valleyLength: number;
    eaveLength: number;
    rakeLength: number;
    stepFlashingLength: number;
    flashingLength: number;
  };
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Length Measurements</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="ridgeLength">Ridge Length (ft)</Label>
            <Input
              id="ridgeLength"
              name="ridgeLength"
              type="number"
              value={measurements.ridgeLength || ""}
              onChange={handleInputChange}
              placeholder="Enter ridge length"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="hipLength">Hip Length (ft)</Label>
            <Input
              id="hipLength"
              name="hipLength"
              type="number"
              value={measurements.hipLength || ""}
              onChange={handleInputChange}
              placeholder="Enter hip length"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="valleyLength">Valley Length (ft)</Label>
            <Input
              id="valleyLength"
              name="valleyLength"
              type="number"
              value={measurements.valleyLength || ""}
              onChange={handleInputChange}
              placeholder="Enter valley length"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="eaveLength">Eave Length (ft)</Label>
            <Input
              id="eaveLength"
              name="eaveLength"
              type="number"
              value={measurements.eaveLength || ""}
              onChange={handleInputChange}
              placeholder="Enter eave length"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="rakeLength">Rake Length (ft)</Label>
            <Input
              id="rakeLength"
              name="rakeLength"
              type="number"
              value={measurements.rakeLength || ""}
              onChange={handleInputChange}
              placeholder="Enter rake length"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="stepFlashingLength">Step Flashing Length (ft)</Label>
            <Input
              id="stepFlashingLength"
              name="stepFlashingLength"
              type="number"
              value={measurements.stepFlashingLength || ""}
              onChange={handleInputChange}
              placeholder="Enter step flashing length"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="flashingLength">Flashing Length (ft)</Label>
            <Input
              id="flashingLength"
              name="flashingLength"
              type="number"
              value={measurements.flashingLength || ""}
              onChange={handleInputChange}
              placeholder="Enter flashing length"
            />
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
