
import { supabase } from "@/integrations/supabase/client";

export interface ParsedMeasurements {
  totalArea?: number;
  roofPitch?: string;
  ridgeLength?: number;
  valleyLength?: number;
  hipLength?: number;
  eaveLength?: number;
  rakeLength?: number;
  stepFlashingLength?: number;
  chimneyCount?: number;
  skylightCount?: number;
  ventCount?: number;
}

export const saveMeasurement = async (
  fileName: string,
  measurements: ParsedMeasurements
) => {
  try {
    const { data, error } = await supabase
      .from('measurements')
      .insert({
        filename: fileName,
        total_area: measurements.totalArea || 0,
        predominant_pitch: measurements.roofPitch || 'Unknown',
        ridges: measurements.ridgeLength || 0,
        valleys: measurements.valleyLength || 0,
        hips: measurements.hipLength || 0,
        eaves: measurements.eaveLength || 0,
        rakes: measurements.rakeLength || 0,
        step_flashing: measurements.stepFlashingLength || 0,
        penetrations: (measurements.chimneyCount || 0) + (measurements.skylightCount || 0) + (measurements.ventCount || 0),
        // Calculate squares from total area (1 square = 100 sq ft)
        total_squares: measurements.totalArea ? Math.ceil(measurements.totalArea / 100) : 0,
        // Store detailed information as JSON
        areas_per_pitch: JSON.stringify({ mainPitch: measurements.roofPitch }),
        length_measurements: JSON.stringify({
          ridge: measurements.ridgeLength,
          valley: measurements.valleyLength,
          hip: measurements.hipLength,
          eave: measurements.eaveLength,
          rake: measurements.rakeLength,
          stepFlashing: measurements.stepFlashingLength
        }),
        debug_info: JSON.stringify({
          chimneyCount: measurements.chimneyCount,
          skylightCount: measurements.skylightCount,
          ventCount: measurements.ventCount
        }),
        raw_text: JSON.stringify(measurements)
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error saving measurement:', error);
    return { data: null, error };
  }
};

export const getMeasurements = async () => {
  try {
    const { data, error } = await supabase
      .from('measurements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching measurements:', error);
    return { data: null, error };
  }
};

export const getMeasurementById = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from('measurements')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching measurement:', error);
    return { data: null, error };
  }
};
