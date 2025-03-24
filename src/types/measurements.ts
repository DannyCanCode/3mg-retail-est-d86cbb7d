// Base interface for common measurement fields
interface BaseMeasurements {
  totalArea: number;
  ridgeLength: number;
  hipLength: number;
  valleyLength: number;
  eaveLength: number;
  rakeLength: number;
  stepFlashingLength: number;
  flashingLength: number;
  dripEdgeLength: number;
  penetrationsArea: number;
  penetrationsPerimeter: number;
  predominantPitch: string;
  roofPitch?: string;
  
  // Count fields
  ridgeCount: number;
  hipCount: number;
  valleyCount: number;
  rakeCount: number;
  eaveCount: number;
  
  // Property information
  propertyAddress: string;
  latitude: string;
  longitude: string;
}

export interface PitchArea {
  // The original pitch format from the PDF (e.g. "4/12" or "4:12")
  pitch: string;
  // The numeric area value
  area: number;
  // The percentage of total roof area
  percentage: number;
}

// ParsedMeasurements is used for the initial PDF extraction
export interface ParsedMeasurements extends BaseMeasurements {
  // Areas by pitch stored as an array for consistent format handling
  areasByPitch: PitchArea[];
}

// MeasurementValues is used throughout the application
export interface MeasurementValues extends BaseMeasurements {
  // Areas by pitch stored as an array for consistent format handling
  areasByPitch: PitchArea[];
} 