
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronRight, ChevronLeft, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { saveMeasurement } from "@/api/measurements";

interface MeasurementValues {
  totalArea: number;
  ridgeLength: number;
  hipLength: number;
  valleyLength: number;
  eaveLength: number;
  rakeLength: number;
  stepFlashingLength: number;
  penetrationsArea: number;
  roofPitch: string;
}

export function MeasurementForm() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("roof-area");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [measurements, setMeasurements] = useState<MeasurementValues>({
    totalArea: 0,
    ridgeLength: 0,
    hipLength: 0,
    valleyLength: 0,
    eaveLength: 0,
    rakeLength: 0,
    stepFlashingLength: 0,
    penetrationsArea: 0,
    roofPitch: "6:12",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = name !== "roofPitch" ? parseFloat(value) || 0 : value;
    
    setMeasurements((prev) => ({
      ...prev,
      [name]: numValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Calculate the total squares based on the total area
      const totalSquares = Math.ceil(measurements.totalArea / 100);
      
      // Save measurements to the database
      const result = await saveMeasurement(
        `manual-entry-${new Date().toISOString()}`,
        {
          ...measurements,
          totalSquares,
          predominantPitch: measurements.roofPitch,
        }
      );
      
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      toast({
        title: "Measurements saved",
        description: "Your roof measurements have been saved successfully.",
      });
      
      // TODO: Move to the next step (materials selection)
    } catch (error) {
      console.error("Error saving measurements:", error);
      toast({
        title: "Error saving measurements",
        description: "There was a problem saving your measurements. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToNextTab = () => {
    if (activeTab === "roof-area") {
      setActiveTab("length-measurements");
    } else if (activeTab === "length-measurements") {
      setActiveTab("review");
    }
  };

  const goToPreviousTab = () => {
    if (activeTab === "length-measurements") {
      setActiveTab("roof-area");
    } else if (activeTab === "review") {
      setActiveTab("length-measurements");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 mb-6">
          <TabsTrigger value="roof-area">Roof Area</TabsTrigger>
          <TabsTrigger value="length-measurements">Length Measurements</TabsTrigger>
          <TabsTrigger value="review">Review & Save</TabsTrigger>
        </TabsList>
        
        <TabsContent value="roof-area">
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
                  <Label htmlFor="roofPitch">Predominant Roof Pitch</Label>
                  <Input
                    id="roofPitch"
                    name="roofPitch"
                    value={measurements.roofPitch || ""}
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
        </TabsContent>
        
        <TabsContent value="length-measurements">
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
        </TabsContent>
        
        <TabsContent value="review">
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
        </TabsContent>
      </Tabs>
    </form>
  );
}
