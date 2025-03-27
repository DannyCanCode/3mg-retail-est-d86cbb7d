import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { saveMeasurement } from "@/api/measurements";
import { RoofAreaTab } from "./measurement/RoofAreaTab";
import { LengthMeasurementsTab } from "./measurement/LengthMeasurementsTab";
import { ReviewTab } from "./measurement/ReviewTab";
import { MeasurementValues, AreaByPitch } from "./measurement/types";
import { Button } from "@/components/ui/button";
import { ChevronLeft, AlertTriangle } from "lucide-react";

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
  const [isIncomplete, setIsIncomplete] = useState(false);
  
  // Initialize with empty measurements
  const emptyMeasurements: MeasurementValues = {
    totalArea: 0,
    ridgeLength: 0,
    hipLength: 0,
    valleyLength: 0,
    eaveLength: 0,
    rakeLength: 0,
    stepFlashingLength: 0,
    flashingLength: 0,
    dripEdgeLength: 0,
    penetrationsArea: 0,
    penetrationsPerimeter: 0,
    predominantPitch: "",
    roofPitch: "",
    ridgeCount: 0,
    hipCount: 0,
    valleyCount: 0,
    rakeCount: 0,
    eaveCount: 0,
    propertyAddress: "",
    latitude: "",
    longitude: "",
    areasByPitch: []
  };
  
  const [measurements, setMeasurements] = useState<MeasurementValues>(emptyMeasurements);

  // Update measurements if initialMeasurements changes (e.g., after PDF extraction)
  useEffect(() => {
    if (initialMeasurements) {
      console.log("Setting measurements from initialMeasurements:", initialMeasurements);
      setMeasurements(initialMeasurements);
      
      // Check if measurements are incomplete
      const requiredFields: (keyof MeasurementValues)[] = [
        'totalArea',
        'predominantPitch',
        'areasByPitch'
      ];
      
      const isDataIncomplete = requiredFields.some(field => {
        if (field === 'areasByPitch') {
          return !initialMeasurements[field] || initialMeasurements[field].length === 0;
        }
        return !initialMeasurements[field];
      });
      
      setIsIncomplete(isDataIncomplete);
    }
  }, [initialMeasurements]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = name !== "roofPitch" && 
                    name !== "propertyAddress" && 
                    name !== "latitude" && 
                    name !== "longitude" 
                    ? parseFloat(value) || 0 
                    : value;
    
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
    setMeasurements(prev => ({
      ...prev,
      areasByPitch: [
        ...prev.areasByPitch,
        { pitch: "4:12", area: 0, percentage: 0 }
      ]
    }));
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
    
    console.log("Submitting measurements:", measurements);
    
    // Enhanced validation
    const requiredFields: (keyof MeasurementValues)[] = [
      'totalArea',
      'predominantPitch',
      'areasByPitch'
    ];
    
    const missingFields = requiredFields.filter(field => {
      if (field === 'areasByPitch') {
        return !measurements[field] || measurements[field].length === 0;
      }
      return !measurements[field];
    });
    
    if (missingFields.length > 0) {
      toast({
        title: "Incomplete measurements",
        description: `Missing required fields: ${missingFields.join(', ')}`,
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }
    
    // Validate total area
    if (measurements.totalArea <= 0) {
      toast({
        title: "Invalid measurements",
        description: "Total roof area must be greater than 0",
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }
    
    // Validate pitch data
    if (measurements.areasByPitch.length === 0) {
      toast({
        title: "Invalid pitch data",
        description: "At least one roof pitch area is required",
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }
    
    const totalPitchPercentage = measurements.areasByPitch.reduce((sum, area) => sum + area.percentage, 0);
    if (Math.abs(totalPitchPercentage - 100) > 0.1) {
      toast({
        title: "Invalid pitch data",
        description: "Total pitch percentages must equal 100%",
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }
    
    // Validate property information if any is provided
    if (measurements.propertyAddress || measurements.latitude || measurements.longitude) {
      if (!measurements.propertyAddress || !measurements.latitude || !measurements.longitude) {
        toast({
          title: "Incomplete property information",
          description: "Please provide all property information or none",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }
    }
    
    setTimeout(() => {
      if (onMeasurementsSaved) {
        console.log("Saving complete measurements:", measurements);
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
      
      {/* Display warning if measurements are incomplete */}
      {isIncomplete && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded">
          <p className="text-sm text-yellow-700 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Incomplete measurements detected. Please ensure all required fields are filled out.
          </p>
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
              measurements={{
                totalArea: measurements.totalArea,
                predominantPitch: measurements.predominantPitch,
                penetrationsArea: measurements.penetrationsArea,
                areasByPitch: measurements.areasByPitch,
                propertyAddress: measurements.propertyAddress,
                latitude: measurements.latitude,
                longitude: measurements.longitude
              }}
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
