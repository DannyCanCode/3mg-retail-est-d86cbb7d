
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { saveMeasurement } from "@/api/measurements";
import { RoofAreaTab } from "./measurement/RoofAreaTab";
import { LengthMeasurementsTab } from "./measurement/LengthMeasurementsTab";
import { ReviewTab } from "./measurement/ReviewTab";
import { MeasurementValues, AreaByPitch } from "./measurement/types";

interface MeasurementFormProps {
  onMeasurementsSaved?: (measurements: MeasurementValues) => void;
}

export function MeasurementForm({ onMeasurementsSaved }: MeasurementFormProps) {
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
    flashingLength: 0,
    penetrationsArea: 0,
    roofPitch: "6:12",
    areasByPitch: [{ pitch: "6:12", area: 0, percentage: 100 }]
  });

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
        newAreas[index].percentage = Math.round((numValue / measurements.totalArea) * 100);
      }
      
      // If updating percentage, recalculate area based on total area
      if (field === 'percentage' && measurements.totalArea > 0) {
        newAreas[index].area = Math.round((numValue / 100) * measurements.totalArea);
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
          area.percentage = Math.round((area.area / totalAreaSum) * 100);
        });
      }
      
      setMeasurements(prev => ({
        ...prev,
        areasByPitch: newAreas
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Prepare the areas per pitch data
      const areasPerPitch: Record<string, { area: number; percentage: number }> = {};
      measurements.areasByPitch.forEach(({ pitch, area, percentage }) => {
        areasPerPitch[pitch] = { area, percentage };
      });
      
      // Save measurements to the database
      const result = await saveMeasurement(
        `manual-entry-${new Date().toISOString()}`,
        {
          totalArea: measurements.totalArea,
          ridgeLength: measurements.ridgeLength,
          hipLength: measurements.hipLength,
          valleyLength: measurements.valleyLength,
          eaveLength: measurements.eaveLength,
          rakeLength: measurements.rakeLength,
          stepFlashingLength: measurements.stepFlashingLength,
          flashingLength: measurements.flashingLength,
          penetrationsArea: measurements.penetrationsArea,
          predominantPitch: measurements.roofPitch,
          areasPerPitch: areasPerPitch
        }
      );
      
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      toast({
        title: "Measurements saved",
        description: "Your roof measurements have been saved successfully.",
      });
      
      // Call the callback if provided
      if (onMeasurementsSaved) {
        onMeasurementsSaved(measurements);
      }
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
            goToPreviousTab={goToPreviousTab}
            goToNextTab={goToNextTab}
          />
        </TabsContent>
        
        <TabsContent value="review">
          <ReviewTab
            measurements={measurements}
            isSubmitting={isSubmitting}
            goToPreviousTab={goToPreviousTab}
          />
        </TabsContent>
      </Tabs>
    </form>
  );
}
