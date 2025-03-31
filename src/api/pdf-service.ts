import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ParsedMeasurements } from './measurements';

// Get the bucket name from environment variables
const PDF_BUCKET_NAME = import.meta.env.VITE_PDF_BUCKET_NAME || 'pdf-uploads';

/**
 * Uploads a PDF file to Supabase Storage and then invokes the edge function for processing
 */
export async function processPdfWithSupabase(file: File): Promise<{
  data: ParsedMeasurements | null;
  error: Error | null;
  fileUrl?: string;
}> {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please add your API keys to the .env file.');
    }

    // First upload the file to Supabase storage
    const timestamp = new Date().getTime();
    const fileName = `${timestamp}-${file.name}`;
    const filePath = `${fileName}`;

    console.log(`Uploading PDF to Supabase Storage bucket '${PDF_BUCKET_NAME}':`, filePath);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(PDF_BUCKET_NAME)
      .upload(filePath, file, {
        contentType: 'application/pdf',
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Error uploading file: ${uploadError.message}`);
    }

    // Get public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from(PDF_BUCKET_NAME)
      .getPublicUrl(filePath);
      
    console.log('File uploaded successfully. Public URL:', publicUrl);

    // Now call the Supabase Edge Function to process the PDF
    console.log('Invoking Supabase Edge Function for PDF processing...');
    
    const { data, error: functionError } = await supabase.functions.invoke(
      'process-pdf', 
      {
        body: { fileUrl: publicUrl, fileName: file.name },
      }
    );

    if (functionError) {
      console.error('Function error:', functionError);
      throw new Error(`Error processing PDF: ${functionError.message}`);
    }

    console.log('PDF processed successfully by Edge Function:', data);
    
    return { 
      data: data as ParsedMeasurements, 
      error: null,
      fileUrl: publicUrl 
    };
  } catch (error) {
    console.error('PDF processing service error:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Unknown error occurred') 
    };
  }
}

/**
 * Save measurements to the database
 */
export async function saveMeasurementsToDatabase(
  fileName: string,
  fileUrl: string,
  measurements: ParsedMeasurements
): Promise<{ data: any; error: Error | null }> {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please add your API keys to the .env file.');
    }

    // Mapping to match the database schema from the images
    console.log("Saving measurement with propertyAddress:", measurements.propertyAddress);
    
    const insertData = {
      filename: fileName,
      total_area: measurements.totalArea || 0,
      predominant_pitch: measurements.predominantPitch || '',
      ridges: measurements.ridgeLength || 0,
      valleys: measurements.valleyLength || 0,
      hips: measurements.hipLength || 0,
      eaves: measurements.eaveLength || 0,
      rakes: measurements.rakeLength || 0,
      step_flashing: measurements.stepFlashingLength || 0,
      flashing: measurements.flashingLength || 0,
      raw_text: JSON.stringify(measurements),
      areas_per_pitch: measurements.areasByPitch || {},
      penetrations: measurements.penetrationsArea || 0,
      penetrations_perimeter: measurements.penetrationsPerimeter || 0,
      waste_percentage: 10, // Default waste percentage
      total_squares: Math.ceil((measurements.totalArea || 0) / 100),
      created_at: new Date().toISOString(),
      // Add address field to store the property address
      address: measurements.propertyAddress || ''
    };
    
    console.log("Database insert data:", insertData);
    
    const { data, error } = await supabase
      .from('measurements')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error saving measurements to database:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Unknown error occurred') 
    };
  }
} 