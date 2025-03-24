export interface ParsedMeasurements {
  totalArea: number;
  ridgeLength: number;
  hipLength: number;
  valleyLength: number;
  eaveLength: number;
  rakeLength: number;
  stepFlashingLength: number;
  flashingLength: number;
  penetrationsArea: number;
  penetrationsPerimeter?: number;
  dripEdgeLength: number;
  predominantPitch: string;
  roofPitch?: string;
  // Count fields
  ridgeCount?: number;
  hipCount?: number;
  valleyCount?: number;
  rakeCount?: number;
  eaveCount?: number;
  areasByPitch: Record<string, PitchArea>;
  propertyAddress: string;
  latitude: string;
  longitude: string;
}

export interface PitchArea {
  area: number;
  percentage: number;
} 