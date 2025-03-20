import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { saveMeasurement } from "@/api/measurements";
import { RoofAreaTab } from "./measurement/RoofAreaTab";
import { LengthMeasurementsTab } from "./measurement/LengthMeasurementsTab";
import { ReviewTab } from "./measurement/ReviewTab";
import { MeasurementValues, AreaByPitch } from "./measurement/types";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

interface MeasurementFormProps {
  onMeasurementsSaved?: (measurements: MeasurementValues) => void;
  initialMeasurements?: MeasurementValues;
  extractedFileName?: string;
  onBack?: () => void;
}

export function MeasurementForm({ 
  onMeasurementsSaved, 
  initialMeasurements,
  extractedFileName,
  onBack
}: MeasurementFormProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("roof-area");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Use initialMeasurements if provided, otherwise use default empty values
  const [measurements, setMeasurements] = useState<MeasurementValues>(
    initialMeasurements || {
      totalArea: 0,
      ridgeLength: 0,
      hipLength: 0,
      valleyLength: 0,
      eaveLength: 0,
      rakeLength: 0,
      stepFlashingLength: 0,
      flashingLength: 0,
      penetrationsArea: 0,
      roofPitch: "6:12",
      areasByPitch: [{ pitch: "6:12", area: 0, percentage: 100 }]
    }
  );

  // Update measurements if initialMeasurements changes (e.g., after PDF extraction)
  useEffect(() => {
    if (initialMeasurements) {
      console.log("Setting measurements from initialMeasurements:", initialMeasurements);
      setMeasurements(initialMeasurements);
    }
  }, [initialMeasurements]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = name !== "roofPitch" ? parseFloat(value) || 0 : value;
    
    setMeasurements((prev) => ({
      ...prev,
      [name]: numValue,
    }));
  };

  const handleAreaByPitchChange = (index: number, field: keyof AreaByPitch, value: string) => {
    const newAreas = [...measurements.areasByPitch];
    
    if (field === 'pitch') {
      newAreas[index].pitch = value;
    } else {
      // Convert to number for area and percentage
      const numValue = parseFloat(value) || 0;
      newAreas[index][field] = numValue;
      
      // If updating area, recalculate percentage based on total area
      if (field === 'area' && measurements.totalArea > 0) {
        newAreas[index].percentage = (numValue / measurements.totalArea) * 100;
      }
      
      // If updating percentage, recalculate area based on total area
      if (field === 'percentage' && measurements.totalArea > 0) {
        newAreas[index].area = (numValue / 100) * measurements.totalArea;
      }
    }
    
    setMeasurements(prev => ({
      ...prev,
      areasByPitch: newAreas
    }));
  };

  const addPitchArea = () => {
    if (measurements.areasByPitch.length < 4) {
      setMeasurements(prev => ({
        ...prev,
        areasByPitch: [
          ...prev.areasByPitch,
          { pitch: "4:12", area: 0, percentage: 0 }
        ]
      }));
    }
  };

  const removePitchArea = (index: number) => {
    if (measurements.areasByPitch.length > 1) {
      const newAreas = [...measurements.areasByPitch];
      newAreas.splice(index, 1);
      
      // Recalculate percentages
      const totalAreaSum = newAreas.reduce((sum, area) => sum + area.area, 0);
      if (totalAreaSum > 0) {
        newAreas.forEach(area => {
          area.percentage = (area.area / totalAreaSum) * 100;
        });
      }
      
      setMeasurements(prev => ({
        ...prev,
        areasByPitch: newAreas
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    console.log("About to save measurements with the following areasByPitch:", measurements.areasByPitch);
    
    // Basic validation
    if (measurements.totalArea <= 0) {
      toast({
        title: "Invalid measurements",
        description: "Total roof area must be greater than 0",
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }
    
    // Recalculate areas by pitch percentages to ensure they add up to 100%
    // This is important when manually editing values
    if (measurements.areasByPitch.length > 0) {
      const totalAreaSum = measurements.areasByPitch.reduce((sum, area) => sum + area.area, 0);
      
      // If there's a significant difference between totalArea and sum of areasByPitch,
      // adjust the areas to match totalArea while preserving proportions
      if (totalAreaSum > 0 && Math.abs(totalAreaSum - measurements.totalArea) > 1) {
        console.log(`Areas by pitch sum (${totalAreaSum}) differs from total area (${measurements.totalArea}), adjusting...`);
        
        const scaleFactor = measurements.totalArea / totalAreaSum;
        const adjustedAreas = measurements.areasByPitch.map(area => ({
          ...area,
          area: Math.round(area.area * scaleFactor),
          percentage: Math.round((area.area / totalAreaSum) * 100)
        }));
        
        // Make sure percentages sum to 100% by adjusting the largest area if needed
        const percentageSum = adjustedAreas.reduce((sum, area) => sum + area.percentage, 0);
        if (percentageSum !== 100) {
          // Find the largest area to adjust
          const largestAreaIndex = adjustedAreas
            .map((area, index) => ({ area: area.area, index }))
            .sort((a, b) => b.area - a.area)[0].index;
            
          adjustedAreas[largestAreaIndex].percentage += (100 - percentageSum);
        }
        
        setMeasurements(prev => ({
          ...prev,
          areasByPitch: adjustedAreas
        }));
        
        console.log("Adjusted areasByPitch:", adjustedAreas);
      }
    }
    
    setTimeout(() => {
      // In a real implementation, save measurements to database
      // For now, just pass to parent component
      if (onMeasurementsSaved) {
        console.log("Saving measurements with areasByPitch:", measurements.areasByPitch);
        onMeasurementsSaved(measurements);
      }
      setIsSubmitting(false);
    }, 1000);
  };

  const goToNextTab = () => {
    if (activeTab === "roof-area") {
      setActiveTab("length-measurements");
    } else if (activeTab === "length-measurements") {
      setActiveTab("review");
    }
  };

  const goToPreviousTab = () => {
    if (activeTab === "review") {
      setActiveTab("length-measurements");
    } else if (activeTab === "length-measurements") {
      setActiveTab("roof-area");
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button to return to PDF upload */}
      {onBack && (
        <div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onBack}
            className="flex items-center gap-1 mb-4"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Upload
          </Button>
        </div>
      )}
      
      {/* Display a message if we're using extracted data */}
      {extractedFileName && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4 rounded">
          <p className="text-sm text-blue-700 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
            </svg>
            Using measurements extracted from <strong>{extractedFileName}</strong>. Please review and make any necessary adjustments.
          </p>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="roof-area">Roof Area</TabsTrigger>
            <TabsTrigger value="length-measurements">Length Measurements</TabsTrigger>
            <TabsTrigger value="review">Review & Save</TabsTrigger>
          </TabsList>
          
          <TabsContent value="roof-area">
            <RoofAreaTab 
              measurements={measurements}
              handleInputChange={handleInputChange}
              handleAreaByPitchChange={handleAreaByPitchChange}
              addPitchArea={addPitchArea}
              removePitchArea={removePitchArea}
              goToNextTab={goToNextTab}
            />
          </TabsContent>
          
          <TabsContent value="length-measurements">
            <LengthMeasurementsTab 
              measurements={measurements}
              handleInputChange={handleInputChange}
              goToNextTab={goToNextTab}
              goToPreviousTab={goToPreviousTab}
            />
          </TabsContent>
          
          <TabsContent value="review">
            <ReviewTab 
              measurements={measurements}
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit}
              goToPreviousTab={goToPreviousTab}
            />
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
}
