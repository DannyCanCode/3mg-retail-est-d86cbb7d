import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { saveMeasurement } from "@/api/measurements";
import { RoofAreaTab } from "./measurement/RoofAreaTab";
import { LengthMeasurementsTab } from "./measurement/LengthMeasurementsTab";
import { ReviewTab } from "./measurement/ReviewTab";
import { MeasurementValues, AreaByPitch } from "./measurement/types";

interface MeasurementFormProps {
  initialValues?: MeasurementValues | null;
  onMeasurementsSaved?: (measurements: MeasurementValues) => void;
  onComplete?: () => void;
}

export function MeasurementForm({ initialValues, onMeasurementsSaved, onComplete }: MeasurementFormProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("roof-area");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Debug initial values when component mounts
  useEffect(() => {
    console.log("CRITICAL: MeasurementForm: MOUNT with initialValues:", initialValues);
    
    // Alert for debugging - this will tell us if initialValues are being passed
    if (initialValues) {
      console.log("Has initial values on mount:", initialValues);
      const areasByPitchCount = Array.isArray(initialValues.areasByPitch) 
        ? initialValues.areasByPitch.length 
        : Object.keys(initialValues.areasByPitch || {}).length;
      
      alert(`MeasurementForm mounting with data!\nTotal Area: ${initialValues.totalArea}\nAreas by pitch: ${areasByPitchCount}`);
    } else {
      console.log("No initial values on mount");
    }
  }, []);
  
  const defaultMeasurements: MeasurementValues = {
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
  };
  
  // Initialize measurements with initialValues or defaults
  const [measurements, setMeasurements] = useState<MeasurementValues>(() => {
    if (initialValues) {
      console.log("CRITICAL: MeasurementForm: Initializing directly with initialValues:", initialValues);
      
      const formattedValues = applyInitialValues(initialValues);
      
      // Log the actual values we're using for initialization
      console.log("CRITICAL: Using these values for initialization:", formattedValues);
      
      // Force values to string to ensure they're displayed
      const stringifiedValues = {
        ...formattedValues,
        totalArea: Number(formattedValues.totalArea || 0),
        ridgeLength: Number(formattedValues.ridgeLength || 0),
        hipLength: Number(formattedValues.hipLength || 0),
        valleyLength: Number(formattedValues.valleyLength || 0),
        eaveLength: Number(formattedValues.eaveLength || 0),
        rakeLength: Number(formattedValues.rakeLength || 0),
        stepFlashingLength: Number(formattedValues.stepFlashingLength || 0),
        flashingLength: Number(formattedValues.flashingLength || 0),
        penetrationsArea: Number(formattedValues.penetrationsArea || 0)
      };
      
      return stringifiedValues;
    }
    return defaultMeasurements;
  });
  
  // Use initialValues when they change
  useEffect(() => {
    if (initialValues) {
      console.log("CRITICAL: MeasurementForm: RECEIVED NEW initialValues:", initialValues);
      const formattedValues = applyInitialValues(initialValues);
      setMeasurements(formattedValues);
    }
  }, [initialValues]);
  
  // Extract the logic to apply initial values to a separate function that returns formatted values
  const applyInitialValues = (values: MeasurementValues): MeasurementValues => {
    console.log("CRITICAL: Applying initial values:", values);
    console.log("CRITICAL: Initial areasByPitch:", values.areasByPitch);
    
    // Ensure that areasByPitch is properly formatted
    let formattedValues = { ...values };
    
    // If areasByPitch is empty, create a default one
    if (!formattedValues.areasByPitch || 
        (Array.isArray(formattedValues.areasByPitch) && formattedValues.areasByPitch.length === 0)) {
      console.log("CRITICAL: Creating default areasByPitch");
      formattedValues.areasByPitch = [{ 
        pitch: formattedValues.roofPitch || "6:12", 
        area: formattedValues.totalArea || 0, 
        percentage: 100 
      }];
    }
    
    // Check if areasByPitch is an array of objects with pitch, area, percentage
    // If not, convert it to the correct format
    if (formattedValues.areasByPitch && !Array.isArray(formattedValues.areasByPitch)) {
      console.log("CRITICAL: Converting areasByPitch from object to array format");
      try {
        const areasByPitchArray = Object.entries(formattedValues.areasByPitch).map(([pitch, area]) => ({
          pitch,
          area: Number(area) || 0,
          percentage: 0 // Will calculate percentages later
        }));
        formattedValues.areasByPitch = areasByPitchArray;
        console.log("CRITICAL: Converted areasByPitch to array:", areasByPitchArray);
      } catch (error) {
        console.error("CRITICAL: Error converting areasByPitch:", error);
        // Fallback to default
        formattedValues.areasByPitch = [{ 
          pitch: formattedValues.roofPitch || "6:12", 
          area: formattedValues.totalArea || 0, 
          percentage: 100 
        }];
      }
    }
    
    // Calculate percentages if they're not already set
    const totalArea = formattedValues.totalArea || 
      (Array.isArray(formattedValues.areasByPitch) ? 
        formattedValues.areasByPitch.reduce((sum, p) => sum + Number(p.area), 0) : 0);
    
    console.log("CRITICAL: Total area for percentage calculation:", totalArea);
    
    if (totalArea > 0 && Array.isArray(formattedValues.areasByPitch)) {
      formattedValues.areasByPitch = formattedValues.areasByPitch.map(p => {
        const area = Number(p.area) || 0;
        const percentage = p.percentage || Math.round((area / totalArea) * 100);
        return { ...p, area, percentage };
      });
      console.log("CRITICAL: Updated percentages:", formattedValues.areasByPitch);
    }
    
    // Ensure the values are the correct types (defensive programming)
    const finalValues = {
      ...formattedValues,
      totalArea: Number(formattedValues.totalArea || 0),
      ridgeLength: Number(formattedValues.ridgeLength || 0),
      hipLength: Number(formattedValues.hipLength || 0),
      valleyLength: Number(formattedValues.valleyLength || 0),
      eaveLength: Number(formattedValues.eaveLength || 0),
      rakeLength: Number(formattedValues.rakeLength || 0),
      stepFlashingLength: Number(formattedValues.stepFlashingLength || 0),
      flashingLength: Number(formattedValues.flashingLength || 0),
      penetrationsArea: Number(formattedValues.penetrationsArea || 0),
      areasByPitch: Array.isArray(formattedValues.areasByPitch) ? 
        formattedValues.areasByPitch.map(area => ({
          pitch: String(area.pitch || "6:12"),
          area: Number(area.area || 0),
          percentage: Number(area.percentage || 0)
        })) : 
        [{ pitch: "6:12", area: formattedValues.totalArea || 0, percentage: 100 }]
    };
    
    console.log("CRITICAL: Final formatted values:", finalValues);
    console.log("CRITICAL: Final areasByPitch:", finalValues.areasByPitch);
    
    // Verify that values are correct
    console.log("CRITICAL: Verifying lengths:", {
      ridgeLength: finalValues.ridgeLength,
      hipLength: finalValues.hipLength,
      valleyLength: finalValues.valleyLength,
      rakeLength: finalValues.rakeLength,
      eaveLength: finalValues.eaveLength,
      stepFlashingLength: finalValues.stepFlashingLength,
      flashingLength: finalValues.flashingLength
    });
    
    return finalValues;
  };
  
  // Debug output to track state changes
  useEffect(() => {
    console.log("CRITICAL: MeasurementForm: Current measurements state:", measurements);
    console.log("CRITICAL: MeasurementForm: Current areasByPitch:", measurements.areasByPitch);
    
    // Debug numeric field values specifically to ensure they're numbers not strings
    console.log("CRITICAL: MeasurementForm: Numeric field values type check:", {
      totalArea: typeof measurements.totalArea,
      ridgeLength: typeof measurements.ridgeLength,
      hipLength: typeof measurements.hipLength,
      valleyLength: typeof measurements.valleyLength, 
      eaveLength: typeof measurements.eaveLength,
      rakeLength: typeof measurements.rakeLength,
      stepFlashingLength: typeof measurements.stepFlashingLength,
      flashingLength: typeof measurements.flashingLength,
      penetrationsArea: typeof measurements.penetrationsArea
    });
  }, [measurements]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = name !== "roofPitch" ? parseFloat(value) || 0 : value;
    
    console.log(`Input change: ${name} = ${value}`);
    
    setMeasurements((prev) => ({
      ...prev,
      [name]: numValue,
    }));
    
    // Update related values for certain fields
    if (name === "totalArea" && parseFloat(value) > 0) {
      // Recalculate percentages for areas by pitch
      const totalArea = parseFloat(value);
      const updatedAreas = measurements.areasByPitch.map(area => {
        const percentage = Math.round((area.area / totalArea) * 100);
        return { ...area, percentage };
      });
      
      setMeasurements(prev => ({
        ...prev,
        areasByPitch: updatedAreas
      }));
    }
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

  const handleSave = async () => {
    setIsSubmitting(true);
    
    try {
      // Calculate total area if needed
      let totalArea = measurements.totalArea;
      if (measurements.areasByPitch.length > 0 && totalArea === 0) {
        totalArea = measurements.areasByPitch.reduce((sum, area) => sum + area.area, 0);
        setMeasurements(prev => ({ ...prev, totalArea }));
      }
      
      // Validate measurements
      if (totalArea <= 0) {
        toast({
          title: "Validation Error",
          description: "Total roof area must be greater than zero",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      
      // Map to the proper format for saving
      const measurementsToSave = {
        totalArea: measurements.totalArea,
        predominantPitch: measurements.roofPitch,
        
        // Length measurements
        ridgeLength: measurements.ridgeLength,
        hipLength: measurements.hipLength,
        valleyLength: measurements.valleyLength,
        rakeLength: measurements.rakeLength,
        eaveLength: measurements.eaveLength,
        stepFlashingLength: measurements.stepFlashingLength,
        flashingLength: measurements.flashingLength,
        dripEdgeLength: 0,
        
        // Count fields (not currently used/collected)
        ridgeCount: 0,
        hipCount: 0,
        valleyCount: 0,
        rakeCount: 0,
        eaveCount: 0,
        
        // Penetrations
        penetrationsArea: measurements.penetrationsArea,
        penetrationsPerimeter: 0, // Not currently used
        
        // Convert array to object for areasByPitch
        areasByPitch: measurements.areasByPitch.reduce((obj, item) => {
          obj[item.pitch] = item.area;
          return obj;
        }, {} as Record<string, number>),
      };
      
      // Save to database
      await saveMeasurement("manual-entry", measurementsToSave);
      
      toast({
        title: "Measurements Saved",
        description: "Your measurements have been saved successfully",
      });
      
      // Call the callback if provided
      if (onMeasurementsSaved) {
        onMeasurementsSaved(measurements);
      }
      
      // If onComplete is provided, call it
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error("Error saving measurements:", error);
      toast({
        title: "Error",
        description: "Failed to save measurements. Please try again.",
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
    <form onSubmit={(e) => {
      e.preventDefault();
      handleSave();
    }} className="space-y-6">
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
            handlePitchAreaChange={handleAreaByPitchChange}
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
