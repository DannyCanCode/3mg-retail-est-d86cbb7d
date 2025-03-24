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
  pitch: string;
  area: number;
  percentage: number;
}

// ParsedMeasurements is used for the initial PDF extraction
export interface ParsedMeasurements extends BaseMeasurements {
  // Areas by pitch stored as a record for easier PDF parsing
  areasByPitch: Record<string, { area: number; percentage: number }>;
}

// MeasurementValues is used throughout the application
export interface MeasurementValues extends BaseMeasurements {
  // Areas by pitch stored as an array for easier UI handling
  areasByPitch: PitchArea[];
} 