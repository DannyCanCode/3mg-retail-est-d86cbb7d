import { supabase } from "@/integrations/supabase/client";

export interface PitchArea {
  pitch: string;
  area: number;
  percentage: number;
}

export interface ParsedMeasurements {
  // Areas
  totalArea: number;
  penetrationsArea: number;
  
  // Main pitch
  predominantPitch: string;
  
  // Lengths
  ridgeLength: number;
  hipLength: number;
  valleyLength: number;
  rakeLength: number;
  eaveLength: number;
  stepFlashingLength: number;
  flashingLength: number;
  dripEdgeLength: number;
  
  // Counts
  ridgeCount: number;
  hipCount: number;
  valleyCount: number;
  rakeCount: number;
  eaveCount: number;
  
  // Penetrations
  penetrationsPerimeter: number;
  
  // Areas by pitch - for storing the pitch table data
  areasByPitch: PitchArea[];
  // Also support areasPerPitch for backward compatibility
  areasPerPitch?: Record<string, number>;
  
  // Allow for any additional properties that might be used internally
  [key: string]: any;
  
  // Add new fields for property information
  longitude: string;
  latitude: string;
  propertyAddress: string;
}

export const saveMeasurement = async (
  fileName: string,
  measurements: ParsedMeasurements
) => {
  try {
    // Convert areasByPitch array to a format suitable for database storage
    const areasPerPitchData = measurements.areasByPitch.reduce((acc, area) => {
      acc[area.pitch] = {
        area: area.area,
        percentage: area.percentage
      };
      return acc;
    }, {} as Record<string, { area: number; percentage: number }>);
    
    console.log("Saving measurement with pitch data:", areasPerPitchData);
    
    const { data, error } = await supabase
      .from('measurements')
      .insert({
        filename: fileName,
        total_area: measurements.totalArea || 0,
        predominant_pitch: measurements.predominantPitch || measurements.roofPitch || 'Unknown',
        ridges: measurements.ridgeLength || 0,
        valleys: measurements.valleyLength || 0,
        hips: measurements.hipLength || 0,
        eaves: measurements.eaveLength || 0,
        rakes: measurements.rakeLength || 0,
        step_flashing: measurements.stepFlashingLength || 0,
        flashing: measurements.flashingLength || 0,
        penetrations: measurements.penetrationsArea || 0,
        penetrations_perimeter: measurements.penetrationsPerimeter || 0,
        // Calculate squares from total area (1 square = 100 sq ft)
        total_squares: measurements.totalArea ? Math.ceil(measurements.totalArea / 100) : 0,
        // Add address field
        address: measurements.propertyAddress || "Manual Entry",
        // Store detailed information as JSON
        areas_per_pitch: JSON.stringify(areasPerPitchData),
        length_measurements: JSON.stringify({
          ridge: { length: measurements.ridgeLength, count: measurements.ridgeCount },
          valley: { length: measurements.valleyLength, count: measurements.valleyCount },
          hip: { length: measurements.hipLength, count: measurements.hipCount },
          eave: { length: measurements.eaveLength, count: measurements.eaveCount },
          rake: { length: measurements.rakeLength, count: measurements.rakeCount },
          stepFlashing: { length: measurements.stepFlashingLength, count: measurements.stepFlashingCount },
          flashing: { length: measurements.flashingLength, count: measurements.flashingCount },
          dripEdge: { length: measurements.dripEdgeLength },
          parapetWall: { length: measurements.parapetWallLength, count: measurements.parapetWallCount }
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
    const { data: rawData, error } = await supabase
      .from('measurements')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    if (!rawData) {
      throw new Error("No measurement data found");
    }

    // Transform the database record back into the expected format
    let areasByPitch: PitchArea[] = [];
    
    // Parse areas_per_pitch from JSON string back to array format
    if (rawData.areas_per_pitch) {
      try {
        const areasPerPitchData = typeof rawData.areas_per_pitch === 'string' 
          ? JSON.parse(rawData.areas_per_pitch) 
          : rawData.areas_per_pitch;
        
        areasByPitch = Object.entries(areasPerPitchData).map(([pitch, areaInfo]: [string, any]) => ({
          pitch: pitch,
          area: areaInfo.area || 0,
          percentage: areaInfo.percentage || 0
        }));
      } catch (parseError) {
        console.error('Error parsing areas_per_pitch:', parseError);
        areasByPitch = [];
      }
    }

    // Create the measurements object in the expected format
    const measurements: ParsedMeasurements = {
      totalArea: rawData.total_area || 0,
      penetrationsArea: rawData.penetrations || 0,
      predominantPitch: rawData.predominant_pitch || 'Unknown',
      ridgeLength: rawData.ridges || 0,
      hipLength: rawData.hips || 0,
      valleyLength: rawData.valleys || 0,
      rakeLength: rawData.rakes || 0,
      eaveLength: rawData.eaves || 0,
      stepFlashingLength: rawData.step_flashing || 0,
      flashingLength: rawData.flashing || 0,
      dripEdgeLength: 0, // Not stored in database yet
      penetrationsPerimeter: rawData.penetrations_perimeter || 0,
      areasByPitch: areasByPitch,
      
      // Parse counts from length_measurements JSON if available
      ridgeCount: 0,
      hipCount: 0,
      valleyCount: 0,
      rakeCount: 0,
      eaveCount: 0,
      
      // Property information
      propertyAddress: (rawData as any).address || 'Unknown Address',
      latitude: '',
      longitude: ''
    };

    // Try to parse length_measurements for counts
    if (rawData.length_measurements) {
      try {
        const lengthData = typeof rawData.length_measurements === 'string' 
          ? JSON.parse(rawData.length_measurements) 
          : rawData.length_measurements;
        
        measurements.ridgeCount = lengthData.ridge?.count || 0;
        measurements.hipCount = lengthData.hip?.count || 0;
        measurements.valleyCount = lengthData.valley?.count || 0;
        measurements.rakeCount = lengthData.rake?.count || 0;
        measurements.eaveCount = lengthData.eave?.count || 0;
      } catch (parseError) {
        console.error('Error parsing length_measurements:', parseError);
      }
    }

    // Return in the expected format with measurements nested
    const transformedData = {
      ...rawData,
      measurements: measurements
    };

    console.log('Successfully transformed measurement data:', transformedData);
    return { data: transformedData, error: null };
  } catch (error) {
    console.error('Error fetching measurement:', error);
    return { data: null, error };
  }
};
