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
  };

  return (
    <div>
      {/* Render your form components here */}
    </div>
  );
};

export default MeasurementForm; 