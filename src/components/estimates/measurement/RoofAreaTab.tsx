import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash, ChevronRight } from "lucide-react";
import { AreaByPitch } from "./types";

interface RoofAreaTabProps {
  measurements: {
    totalArea: number;
    predominantPitch: string;
    penetrationsArea: number;
    areasByPitch: AreaByPitch[];
    propertyAddress: string;
    latitude: string;
    longitude: string;
  };
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAreaByPitchChange: (index: number, field: keyof AreaByPitch, value: string) => void;
  addPitchArea: () => void;
  removePitchArea: (index: number) => void;
  goToNextTab: () => void;
}

export function RoofAreaTab({
  measurements,
  handleInputChange,
  handleAreaByPitchChange,
  addPitchArea,
  removePitchArea,
  goToNextTab,
}: RoofAreaTabProps) {
  // Calculate if any of the pitches are flat (requires special materials)
  const hasFlatRoofAreas = measurements.areasByPitch.some(
    area => ["0:12", "1:12", "2:12"].includes(area.pitch)
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
              value={measurements.totalArea || ""}
              onChange={handleInputChange}
              placeholder="Enter total roof area"
            />
            <p className="text-sm text-muted-foreground">
              The total area of the roof in square feet
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="predominantPitch">Predominant Roof Pitch</Label>
            <Input
              id="predominantPitch"
              name="predominantPitch"
              value={measurements.predominantPitch || ""}
              onChange={handleInputChange}
              placeholder="e.g., 6:12"
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
              value={measurements.penetrationsArea || ""}
              onChange={handleInputChange}
              placeholder="Enter penetrations area"
            />
            <p className="text-sm text-muted-foreground">
              Total area of penetrations (vents, skylights, etc.)
            </p>
          </div>
        </div>

        {/* Property Location Information */}
        <div className="mt-4 space-y-4">
          <h3 className="text-lg font-semibold">Property Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="propertyAddress">Property Address</Label>
              <Input
                id="propertyAddress"
                name="propertyAddress"
                value={measurements.propertyAddress || ""}
                onChange={handleInputChange}
                placeholder="Enter property address"
              />
              <p className="text-sm text-muted-foreground">
                The full address of the property
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  name="latitude"
                  value={measurements.latitude || ""}
                  onChange={handleInputChange}
                  placeholder="e.g., 28.5383"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  name="longitude"
                  value={measurements.longitude || ""}
                  onChange={handleInputChange}
                  placeholder="e.g., -81.3792"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Areas by Pitch</h3>
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
          </div>
          
          <div className="grid grid-cols-12 gap-2 font-medium text-sm">
            <div className="col-span-3">Roof Pitch</div>
            <div className="col-span-4">Area (sq ft)</div>
            <div className="col-span-4">% of Roof</div>
            <div className="col-span-1"></div>
          </div>
          
          {measurements.areasByPitch.map((area, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3">
                <Input
                  value={area.pitch}
                  onChange={(e) => handleAreaByPitchChange(index, 'pitch', e.target.value)}
                  placeholder="e.g., 6:12"
                />
              </div>
              <div className="col-span-4">
                <Input
                  type="number"
                  value={area.area || ""}
                  onChange={(e) => handleAreaByPitchChange(index, 'area', e.target.value)}
                  placeholder="Area"
                />
              </div>
              <div className="col-span-4">
                <Input
                  type="number"
                  value={area.percentage || ""}
                  onChange={(e) => handleAreaByPitchChange(index, 'percentage', e.target.value)}
                  placeholder="Percentage"
                  min="0"
                  max="100"
                />
              </div>
              <div className="col-span-1">
                {measurements.areasByPitch.length > 1 && (
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
