import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

const MeasurementForm: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [measurementValues, setMeasurementValues] = useState({
    propertyAddress: "",
    // Add other necessary measurement fields here
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Set isSubmitting state to true
    setIsSubmitting(true);
    
    try {
      // Ensure propertyAddress is set
      const enhancedMeasurements = {
        ...measurementValues,
        propertyAddress: measurementValues.propertyAddress || "Manual Entry"
      };
      
      console.log("Submitting measurements with address:", enhancedMeasurements.propertyAddress);
      
      // Call the saveMeasurement API
      const { data, error } = await saveMeasurement(
        `manual-entry-${new Date().toISOString()}`,
        enhancedMeasurements
      );
      
      if (error) {
        throw error;
      }
      
      console.log("Measurement saved successfully:", data);
      
      // Show success toast
      toast({
        title: "Success",
        description: "Measurement data saved successfully",
      });
      
      // Call the onSave callback with the saved data
      if (onSave) {
        onSave(data);
      }
    } catch (error) {
      console.error("Error saving measurement:", error);
      
      // Show error toast
      toast({
        title: "Error",
        description: "Failed to save measurement data",
        variant: "destructive",
      });
    } finally {
      // Set isSubmitting state back to false
      setIsSubmitting(false);
    }

    // --- BEGIN Auto-adjust pitch percentage --- 
    let currentTotalPercentage = measurements.areasByPitch.reduce((sum, area) => sum + (area.percentage || 0), 0);
    console.log(`[handleSubmit] Initial total percentage: ${currentTotalPercentage}`);
    
    // Create a mutable copy to potentially adjust
    let adjustedMeasurements = { ...measurements, areasByPitch: [...measurements.areasByPitch] }; 

    // Adjust if needed and possible (more than one pitch entry)
    if (adjustedMeasurements.areasByPitch.length > 0 && Math.abs(currentTotalPercentage - 100) > 0.01) { // Use a small tolerance
        const lastIndex = adjustedMeasurements.areasByPitch.length - 1;
        const difference = 100 - currentTotalPercentage;
        const adjustedPercentage = (adjustedMeasurements.areasByPitch[lastIndex].percentage || 0) + difference;
        
        // Only apply if the adjusted percentage is reasonable (e.g., >= 0)
        if (adjustedPercentage >= 0) {
            // Adjust percentage in the copy
            adjustedMeasurements.areasByPitch[lastIndex] = { 
              ...adjustedMeasurements.areasByPitch[lastIndex],
              percentage: adjustedPercentage 
            };
            
            // Optionally recalculate the area for the last item based on the adjusted percentage
            if (adjustedMeasurements.totalArea > 0) {
                 adjustedMeasurements.areasByPitch[lastIndex] = {
                   ...adjustedMeasurements.areasByPitch[lastIndex],
                   area: (adjustedPercentage / 100) * adjustedMeasurements.totalArea
                 };
            }
            console.log(`[handleSubmit] Adjusted last pitch (${adjustedMeasurements.areasByPitch[lastIndex].pitch}) percentage to ${adjustedPercentage.toFixed(2)}% to sum to 100%`);
             // Update the state with the adjusted values so validation uses them
             setMeasurements(adjustedMeasurements); 
        } else {
            console.warn("[handleSubmit] Could not auto-adjust percentages, adjustment would result in negative percentage.");
            // If adjustment failed, proceed with original data for validation
            adjustedMeasurements = measurements; 
        }
    } else {
        // No adjustment needed, use original data
        adjustedMeasurements = measurements;
    }
    // --- END Auto-adjust pitch percentage ---

    // Validate pitch data using the potentially adjusted measurements
    const totalPitchPercentage = adjustedMeasurements.areasByPitch.reduce((sum, area) => sum + (area.percentage || 0), 0);
    if (Math.abs(totalPitchPercentage - 100) > 0.1) { 
      toast({
        title: "Invalid pitch data",
        description: "Total pitch percentages must equal 100%",
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }
    
    try {
      if (onMeasurementsSaved) {
        // Pass the potentially adjusted measurements to the callback
        console.log("Saving complete measurements:", adjustedMeasurements);
        await new Promise<void>((resolve) => {
          onMeasurementsSaved(adjustedMeasurements);
        });
      }
    } catch (error) {
      console.error("Error saving measurements:", error);
      
      // Show error toast
      toast({
        title: "Error",
        description: "Failed to save measurements",
        variant: "destructive",
      });
    }
  };

  return (
    <div>
      {/* Render your form components here */}
    </div>
  );
};

export default MeasurementForm; 