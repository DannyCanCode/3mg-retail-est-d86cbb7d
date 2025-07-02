import { ParsedMeasurements } from "@/api/measurements";
import { AreaByPitch } from "@/components/estimates/measurement/types";

/**
 * Debug utility to log and validate PDF parsing results
 */
export function debugPdfParsingResult(measurements: ParsedMeasurements | null, source: string) {
  if (!measurements) {
    console.error(`[${source}] No measurements data found`);
    return false;
  }

  // Log basic info
  console.log(`[${source}] Total area: ${measurements.totalArea || 0} sq ft`);
  console.log(`[${source}] Predominant pitch: ${measurements.predominantPitch || 'unknown'}`);
  
  // Check if areasByPitch exists
  if (!measurements.areasByPitch) {
    console.warn(`[${source}] No areasByPitch data found`);
    return false;
  }
  
  // Check format of areasByPitch
  if (Array.isArray(measurements.areasByPitch)) {
    console.log(`[${source}] areasByPitch is in array format with ${measurements.areasByPitch.length} items`);
    
    // Validate array items
    measurements.areasByPitch.forEach((area, index) => {
      if (!area.pitch || typeof area.area !== 'number') {
        console.warn(`[${source}] Invalid area data at index ${index}:`, area);
      } else {
        console.log(`[${source}] Area ${index}: ${area.pitch} = ${area.area} sq ft (${area.percentage || 0}%)`);
      }
    });
  } else if (typeof measurements.areasByPitch === 'object' && !Array.isArray(measurements.areasByPitch)) {
    console.log(`[${source}] areasByPitch is in TRUE object format with ${Object.keys(measurements.areasByPitch).length} keys`);
    
    // Validate object properties
    for (const [pitch, area] of Object.entries(measurements.areasByPitch)) {
      if (typeof area !== 'number') {
        console.warn(`[${source}] Invalid area value for pitch ${pitch}:`, area);
      } else {
        console.log(`[${source}] Area: ${pitch} = ${area} sq ft`);
      }
    }
  } else {
    console.warn(`[${source}] Unexpected areasByPitch format:`, typeof measurements.areasByPitch, Array.isArray(measurements.areasByPitch));
  }
  
  // Log lat/long and address if available
  if (measurements.latitude && measurements.longitude) {
    console.log(`[${source}] Location: ${measurements.latitude}, ${measurements.longitude}`);
  }
  
  if (measurements.propertyAddress) {
    console.log(`[${source}] Property address: ${measurements.propertyAddress}`);
  }
  
  return true;
}

/**
 * Convert areasByPitch from object to array format
 */
export function convertAreasToArrayFormat(areasByPitch: Record<string, number> | AreaByPitch[]): AreaByPitch[] {
  // If already in array format, return as is
  if (Array.isArray(areasByPitch)) {
    return areasByPitch;
  }
  
  // Calculate total area for percentage calculation
  const totalArea = Object.values(areasByPitch).reduce((sum, area) => sum + Number(area), 0);
  
  // Convert to array format with calculated percentages
  const result = Object.entries(areasByPitch).map(([pitch, area]) => {
    const numericArea = Number(area) || 0;
    const percentage = totalArea > 0 ? (numericArea / totalArea) * 100 : 0;
    
    return {
      pitch,
      area: numericArea,
      percentage
    };
  });
  
  // Sort by area (largest first)
  return result.sort((a, b) => b.area - a.area);
}

/**
 * Interface for sanitized measurements that includes both formats of areasByPitch
 */
export interface SanitizedMeasurements extends Omit<ParsedMeasurements, 'areasByPitch'> {
  areasByPitch: Record<string, number> | AreaByPitch[];
  roofPitch?: string;
}

/**
 * Sanitize measurements data to ensure it has the required structure
 */
export function sanitizeMeasurements(measurements: ParsedMeasurements): SanitizedMeasurements {
  // Create a copy to avoid modifying the original
  const sanitized = { ...measurements } as SanitizedMeasurements;
  
  // Ensure numeric fields are numbers
  sanitized.totalArea = Number(sanitized.totalArea || 0);
  sanitized.ridgeLength = Number(sanitized.ridgeLength || 0);
  sanitized.hipLength = Number(sanitized.hipLength || 0);
  sanitized.valleyLength = Number(sanitized.valleyLength || 0);
  sanitized.rakeLength = Number(sanitized.rakeLength || 0);
  sanitized.eaveLength = Number(sanitized.eaveLength || 0);
  sanitized.stepFlashingLength = Number(sanitized.stepFlashingLength || 0);
  sanitized.flashingLength = Number(sanitized.flashingLength || 0);
  sanitized.penetrationsArea = Number(sanitized.penetrationsArea || 0);
  
  // Ensure predominantPitch is set
  sanitized.predominantPitch = sanitized.predominantPitch || sanitized.roofPitch || "6:12";
  
  // Create roofPitch property if it doesn't exist
  if (!sanitized.roofPitch) {
    sanitized.roofPitch = sanitized.predominantPitch;
  }
  
  // Ensure areasByPitch is in the correct format
  if (!sanitized.areasByPitch || 
      (Array.isArray(sanitized.areasByPitch) && sanitized.areasByPitch.length === 0) || 
      (!Array.isArray(sanitized.areasByPitch) && Object.keys(sanitized.areasByPitch).length === 0)) {
    // Create a default entry using the total area and predominant pitch
    sanitized.areasByPitch = [{
      pitch: sanitized.predominantPitch,
      area: sanitized.totalArea,
      percentage: 100
    }];
  } else if (!Array.isArray(sanitized.areasByPitch)) {
    // Convert object format to array format
    sanitized.areasByPitch = convertAreasToArrayFormat(sanitized.areasByPitch as Record<string, number>);
  }
  
  return sanitized;
} 