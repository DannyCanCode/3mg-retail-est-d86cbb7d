import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ParsedMeasurements } from './measurements';

// Get the bucket name from environment variables
const PDF_BUCKET_NAME = import.meta.env.VITE_PDF_BUCKET_NAME || 'pdf-uploads';

// Lightweight helper: upload file and return public URL without invoking Edge Function
export async function uploadPdfToStorage(file: File): Promise<string> {
  if (!isSupabaseConfigured()) throw new Error("Supabase not configured");

  const timestamp = Date.now();
  const fileName = `${timestamp}-${file.name}`;
  const { error: uploadErr } = await supabase.storage
    .from(PDF_BUCKET_NAME)
    .upload(fileName, file, { contentType: "application/pdf", cacheControl: "3600" });

  if (uploadErr) throw uploadErr;

  return supabase.storage.from(PDF_BUCKET_NAME).getPublicUrl(fileName).data.publicUrl;
}

// Server-side PDF processing removed - using client-side parsing only
// Keeping uploadPdfToStorage function for file storage after client-side parsing

/**
 * Save measurements to the database
 */
export async function saveMeasurementsToDatabase(
  fileName: string,
  fileUrl: string,
  parsedData: ParsedMeasurements
): Promise<{ data: any; error: Error | null }> {
  try {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please add your API keys to the .env file.');
    }

    // 1. Log the data received by this function
    console.log("[saveMeasurementsToDatabase] Received parsedData:", JSON.stringify(parsedData, null, 2));

    // 🔍 PITCH CORRUPTION PREVENTION: Log areasByPitch data format
    console.log("🔍 [SAVE PITCH DATA] Original areasByPitch:", parsedData.areasByPitch);
    console.log("🔍 [SAVE PITCH DATA] Type:", typeof parsedData.areasByPitch);
    console.log("🔍 [SAVE PITCH DATA] Is array:", Array.isArray(parsedData.areasByPitch));

    // 2. Construct the object to be inserted, matching the schema exactly
    const dataToInsert = {
      // --- Required Fields --- 
      filename: fileName,
      total_area: parsedData.totalArea || 0,
      predominant_pitch: parsedData.predominantPitch || 'Unknown',

      // --- Optional Fields (using correct schema names) --- 
      total_squares: parsedData.totalArea ? Math.ceil(parsedData.totalArea / 100) : null,
      ridges: parsedData.ridgeLength,
      valleys: parsedData.valleyLength,
      hips: parsedData.hipLength,
      eaves: parsedData.eaveLength,
      rakes: parsedData.rakeLength,
      flashing: parsedData.flashingLength,
      step_flashing: parsedData.stepFlashingLength,
      penetrations: parsedData.penetrationsArea,
      penetrations_perimeter: parsedData.penetrationsPerimeter,
      waste_percentage: parsedData.wastePercentage,
      suggested_waste_percentage: parsedData.suggestedWastePercentage,
      areas_per_pitch: parsedData.areasByPitch as any,
      length_measurements: parsedData.lengthMeasurements as any,
      debug_info: parsedData.debugInfo as any,
      raw_text: parsedData.rawText,
      property_address: parsedData.propertyAddress,
    };
    
    // 🔍 PITCH CORRUPTION PREVENTION: Log what's being saved to database
    console.log("🔍 [SAVE PITCH DATA] Saving areas_per_pitch as:", dataToInsert.areas_per_pitch);

    // 3. Log the EXACT object being sent to Supabase
    console.log("[saveMeasurementsToDatabase] Data object being inserted:", JSON.stringify(dataToInsert, null, 2));

    const { data, error } = await supabase
      .from('measurements')
      .insert([dataToInsert])
      .select()
      .single();

    if (error) {
      // 4. Log individual error properties for more detail
      console.error("[saveMeasurementsToDatabase] Supabase Error Code:", error.code);
      console.error("[saveMeasurementsToDatabase] Supabase Error Message:", error.message);
      console.error("[saveMeasurementsToDatabase] Supabase Error Details:", error.details);
      console.error("[saveMeasurementsToDatabase] Supabase Error Hint:", error.hint);
      console.error("[saveMeasurementsToDatabase] Full Supabase Error Object:", error);
      throw error;
    }

    console.log("[saveMeasurementsToDatabase] Insert successful:", data);
    return { data, error: null };

  } catch (catchError) {
    console.error('[saveMeasurementsToDatabase] Caught exception during insert:', catchError);
    return { 
      data: null, 
      error: catchError instanceof Error ? catchError : new Error('Unknown error occurred during measurement save') 
    };
  }
} 