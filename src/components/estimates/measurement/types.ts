export interface AreaByPitch {
  pitch: string;
  area: number;
  percentage: number;
}

export interface MeasurementValues {
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
  
  // Newly added optional properties based on usage in MaterialsSelectionTab
  steepSlopeArea?: number; 
  wallFlashingLength?: number;
  numPipeJack1?: number;
  
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
  
  // Areas by pitch
  areasByPitch: AreaByPitch[];
}
