export interface AreaByPitch {
  pitch: string;
  area: number;
}

export interface MeasurementValues {
  totalArea: number;
  predominantPitch: string;
  ridgeLength: number;
  hipLength: number;
  valleyLength: number;
  rakeLength: number;
  eaveLength: number;
  ridgeCount: number;
  hipCount: number;
  valleyCount: number;
  rakeCount: number;
  eaveCount: number;
  stepFlashingLength: number;
  flashingLength: number;
  penetrationsArea: number;
  penetrationsPerimeter: number;
  dripEdgeLength: number;
  areasByPitch: { [key: string]: number };
  longitude?: string;
  latitude?: string;
  propertyAddress?: string;
} 