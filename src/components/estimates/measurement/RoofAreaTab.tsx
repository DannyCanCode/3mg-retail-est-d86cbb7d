import React, { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash, ChevronRight } from "lucide-react";
import { AreaByPitch } from "./types";

interface RoofAreaTabProps {
  measurements: {
    totalArea: number;
    roofPitch: string;
    penetrationsArea: number;
    areasByPitch: AreaByPitch[];
  };
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handlePitchAreaChange: (index: number, field: keyof AreaByPitch, value: string) => void;
  addPitchArea: () => void;
  removePitchArea: (index: number) => void;
  goToNextTab: () => void;
}

export function RoofAreaTab({
  measurements,
  handleInputChange,
  handlePitchAreaChange,
  addPitchArea,
  removePitchArea,
  goToNextTab,
}: RoofAreaTabProps) {
  // Add debug logging to track measurements
  useEffect(() => {
    console.log("CRITICAL: RoofAreaTab: Rendering with measurements:", measurements);
    console.log("CRITICAL: RoofAreaTab: Areas by pitch data:", measurements.areasByPitch);
    console.log("CRITICAL: RoofAreaTab: Areas by pitch type:", Array.isArray(measurements.areasByPitch) ? "array" : typeof measurements.areasByPitch);
    console.log("CRITICAL: RoofAreaTab: Total area:", measurements.totalArea);
    console.log("CRITICAL: RoofAreaTab: Roof pitch:", measurements.roofPitch);
    console.log("CRITICAL: RoofAreaTab: Penetrations area:", measurements.penetrationsArea);
    
    // Verify the data structure is correct
    if (Array.isArray(measurements.areasByPitch)) {
      measurements.areasByPitch.forEach((area, index) => {
        console.log(`CRITICAL: RoofAreaTab: Area ${index}:`, {
          pitch: area.pitch,
          area: area.area,
          percentage: area.percentage,
          typeOfArea: typeof area.area,
          typeOfPercentage: typeof area.percentage
        });
      });
    }
  }, [measurements]);

  // Helper function to format value display
  const formatValueForInput = (value: number | undefined): string => {
    if (value === undefined || value === null) return "";
    if (value === 0) return "0";
    return value.toString();
  };

  // Calculate if any of the pitches are flat (requires special materials)
  const hasFlatRoofAreas = Array.isArray(measurements.areasByPitch) && 
    measurements.areasByPitch.some(
      area => area.pitch && ["0:12", "1:12", "2:12"].includes(area.pitch)
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roof Area Measurements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="totalArea">Total Roof Area (sq ft)</Label>
            <Input
              id="totalArea"
              name="totalArea"
              type="number"
              value={formatValueForInput(measurements.totalArea)}
              onChange={handleInputChange}
              placeholder="Enter total roof area"
              data-testid="total-area-input"
            />
            <p className="text-sm text-muted-foreground">
              The total area of the roof in square feet
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="roofPitch">Predominant Roof Pitch</Label>
            <Input
              id="roofPitch"
              name="roofPitch"
              value={measurements.roofPitch || ""}
              onChange={handleInputChange}
              placeholder="e.g., 6:12"
              data-testid="roof-pitch-input"
            />
            <p className="text-sm text-muted-foreground">
              The most common pitch on the roof (e.g., 4:12, 6:12)
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="penetrationsArea">Penetrations Area (sq ft)</Label>
            <Input
              id="penetrationsArea"
              name="penetrationsArea"
              type="number"
              value={formatValueForInput(measurements.penetrationsArea)}
              onChange={handleInputChange}
              placeholder="Enter penetrations area"
              data-testid="penetrations-area-input"
            />
            <p className="text-sm text-muted-foreground">
              Total area of penetrations (vents, skylights, etc.)
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Areas by Pitch</h3>
            {Array.isArray(measurements.areasByPitch) && measurements.areasByPitch.length < 4 && (
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={addPitchArea}
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Pitch
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-12 gap-2 font-medium text-sm">
            <div className="col-span-3">Roof Pitch</div>
            <div className="col-span-4">Area (sq ft)</div>
            <div className="col-span-4">% of Roof</div>
            <div className="col-span-1"></div>
          </div>
          
          {Array.isArray(measurements.areasByPitch) && measurements.areasByPitch.map((area, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3">
                <Input
                  value={area.pitch || ""}
                  onChange={(e) => handlePitchAreaChange(index, 'pitch', e.target.value)}
                  placeholder="e.g., 6:12"
                  data-testid={`pitch-input-${index}`}
                />
              </div>
              <div className="col-span-4">
                <Input
                  type="number"
                  value={formatValueForInput(area.area)}
                  onChange={(e) => handlePitchAreaChange(index, 'area', e.target.value)}
                  placeholder="Area"
                  data-testid={`area-input-${index}`}
                />
              </div>
              <div className="col-span-4">
                <Input
                  type="number"
                  value={formatValueForInput(area.percentage)}
                  onChange={(e) => handlePitchAreaChange(index, 'percentage', e.target.value)}
                  placeholder="Percentage"
                  min="0"
                  max="100"
                  data-testid={`percentage-input-${index}`}
                />
              </div>
              <div className="col-span-1">
                {Array.isArray(measurements.areasByPitch) && measurements.areasByPitch.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removePitchArea(index)}
                    className="h-8 w-8"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          
          {hasFlatRoofAreas && (
            <div className="px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-md mt-4">
              <p className="text-sm text-amber-700">
                <strong>Note:</strong> Flat or low-slope areas (0:12, 1:12, 2:12) will require special base and cap materials instead of shingles.
              </p>
            </div>
          )}
        </div>

        <div className="px-4 py-3 bg-secondary/30 rounded-md">
          <p className="text-sm text-muted-foreground">
            <strong>Tip:</strong> Total roof area is typically measured in square feet. One roofing square equals 100 square feet.
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
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
