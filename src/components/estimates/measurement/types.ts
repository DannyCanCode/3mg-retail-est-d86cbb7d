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
  penetrationsArea: number;
  roofPitch: string;
  areasByPitch: AreaByPitch[];
  latitude?: string;
  longitude?: string;
  propertyAddress?: string;
}
