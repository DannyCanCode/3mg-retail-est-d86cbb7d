import { useNavigate } from "react-router-dom";
import { ParsedMeasurements } from "@/api/measurements";
import { toast } from "@/hooks/use-toast";
import { isSupabaseConfigured } from "@/integrations/supabase/client";
import { saveMeasurementsToDatabase } from "@/api/pdf-service";

export function useMeasurementStorage() {
  const navigate = useNavigate();

  const saveToDatabase = async (
    fileName: string, 
    parsedData: ParsedMeasurements,
    fileUrl?: string
  ) => {
    try {
      if (!isSupabaseConfigured()) {
        console.log("Supabase not configured, measurements will not be saved to database");
        toast({
          title: "Configuration Missing",
          description: "Measurements processed successfully, but not saved to database (Supabase not configured).",
          variant: "destructive",
        });
        
        // Still navigate to the estimates page but without a measurement ID
        navigate(`/estimates`);
        return null;
      }
      
      // Use the provided fileUrl or a placeholder
      const url = fileUrl || `local://pdf/${fileName}`;
      
      if (!parsedData || !parsedData.totalArea || parsedData.totalArea <= 0) {
        console.error("Invalid or missing totalArea from parser:", parsedData?.totalArea);
        toast({
          title: "Parsing Incomplete",
          description: "Failed to extract a valid total roof area from the PDF. Cannot save measurements.",
          variant: "destructive",
        });
        // Stop the process here, do not attempt to save
        return null; // Return null to indicate failure
      }

      const { data, error } = await saveMeasurementsToDatabase(fileName, url, parsedData);
      
      if (error) {
        console.error("Detailed Supabase Save Error:", JSON.stringify(error, null, 2)); 
        throw error; // Re-throw the original error to be caught below
      }

      toast({
        title: "Measurements saved",
        description: "Measurements have been saved to the database.",
      });
      
      // Navigate to create estimate page with measurement ID
      if (data && data.id) {
        navigate(`/estimates?measurementId=${data.id}`);
      } else {
        navigate(`/estimates`);
      }

      return data;
    } catch (error) {
      console.error("Error saving measurements:", error);
      toast({
        title: "Save failed",
        description: "Failed to save measurements to database. Check console for details.",
        variant: "destructive",
      });
      return null;
    }
  };

  return { saveToDatabase };
}
