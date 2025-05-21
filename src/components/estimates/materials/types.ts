export interface MaterialCoverageRule {
  description: string;
  calculation: string;
}

export interface Material {
  id: string;
  name: string;
  category: MaterialCategory;
  price: number;
  unit: string;
  coverageRule: MaterialCoverageRule;
  coverageAmount?: number;
  // For display purposes
  approxPerSquare?: number;
  bundlesPerSquare?: number;
  coveragePerUnit?: number;
}

export enum MaterialCategory {
  SHINGLES = "SHINGLES",
  UNDERLAYMENTS = "UNDERLAYMENTS",
  LOW_SLOPE = "LOW_SLOPE",
  METAL = "METAL",
  VENTILATION = "VENTILATION",
  ACCESSORIES = "ACCESSORIES"
}

export interface MaterialsSelectionState {
  selectedMaterials: {[key: string]: Material};
  quantities: {[key: string]: number};
  waste: number;
}
