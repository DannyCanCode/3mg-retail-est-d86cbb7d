import { useNavigate } from "react-router-dom";
import { saveMeasurement, ParsedMeasurements } from "@/api/measurements";
import { toast } from "@/hooks/use-toast";
import { isOnlineMode } from "@/integrations/supabase/client";

export function useMeasurementStorage() {
  const navigate = useNavigate();

  const saveToDatabase = async (fileName: string, parsedData: ParsedMeasurements) => {
    try {
      if (!isOnlineMode) {
        console.log("Running in offline mode, measurements will not be saved to database");
        toast({
          title: "Offline Mode",
          description: "Measurements processed successfully, but not saved to database (offline mode).",
        });
        
        // In offline mode, we'll still navigate to the estimates page,
        // but without a measurement ID
        navigate(`/estimates`);
        return null;
      }
      
      const { data, error } = await saveMeasurement(fileName, parsedData);
      
      if (error) {
        throw error;
      }

      toast({
        title: "Measurements saved",
        description: "Measurements have been saved to the database.",
      });
      
      // Navigate to create estimate page with measurement ID
      if (data) {
        navigate(`/estimates?measurementId=${data.id}`);
      }

      return data;
    } catch (error) {
      console.error("Error saving measurements:", error);
      toast({
        title: "Save failed",
        description: "Failed to save measurements to database.",
        variant: "destructive",
      });
      return null;
    }
  };

  return { saveToDatabase };
}
