import { Material, MaterialCategory } from "./types";
import { MeasurementValues } from "../measurement/types";

export function calculateMaterialQuantity(
  material: Material,
  measurements: MeasurementValues,
  wasteFactor: number
): number {
  // Make sure we have a valid waste factor
  let actualWasteFactor = wasteFactor;
  
  // Special handling for GAF Timberline HDZ - minimum 12% waste
  if (material.id === "gaf-timberline-hdz") {
    actualWasteFactor = Math.max(wasteFactor, 0.12);
  }
  
  // Calculate area with waste applied
  const totalAreaWithWaste = Math.abs(measurements.totalArea) * (1 + actualWasteFactor);
  
  // Calculate squares (100 sq ft = 1 square)
  let totalSquares = totalAreaWithWaste / 100;
  
  // For GAF Timberline HDZ, use Excel formula rounding
  if (material.id === "gaf-timberline-hdz") {
    totalSquares = Math.round(totalSquares * 10) / 10;
  }

  // Apply coverage rules based on material type and description
  if (material.id === "gaf-timberline-hdz") {
    // Special case for GAF Timberline HDZ
    return Math.max(3, Math.ceil(totalSquares * 3));
  } else if (material.category === MaterialCategory.SHINGLES) {
    // Handle regular shingles
    if (material.coverageRule.description.includes("Bundle")) {
      if (material.coverageRule.description.includes("Hip & Ridge") || 
          material.coverageRule.description.includes("Hip and Ridge")) {
        // Hip and ridge shingles usually cover 25 LF per bundle
        const ridgeHipLength = (measurements.ridgeLength || 0) + (measurements.hipLength || 0);
        return Math.ceil(ridgeHipLength * (1 + actualWasteFactor) / 25);
      } else if (material.coverageRule.description.includes("Starter")) {
        // Starter shingles usually cover 120 LF per bundle for GAF
        const eaveRakeLength = (measurements.eaveLength || 0) + (measurements.rakeLength || 0);
        return Math.ceil(eaveRakeLength * (1 + actualWasteFactor) / 120);
      } else {
        // Default shingle bundle calculation (3 bundles per square)
        return Math.ceil(totalSquares * 3);
      }
    }
  } else if (material.category === MaterialCategory.UNDERLAYMENTS) {
    // Underlayment calculations
    if (material.coverageRule.description.includes("Peel & Stick") || 
        material.coverageRule.description.includes("Weatherwatch")) {
      // Calculate ice & water shield for valleys and eaves
      const valleyArea = (measurements.valleyLength || 0) * 3 * 0.167;
      const eaveArea = (measurements.eaveLength || 0) * 3 * 0.167;
      const totalIceWaterArea = (valleyArea + eaveArea) * (1 + actualWasteFactor);
      return Math.max(Math.ceil(totalIceWaterArea / 200), 1);
    } else {
      // Regular synthetic underlayment (usually 10 squares per roll)
      return Math.ceil(totalSquares / 10);
    }
  } else if (material.category === MaterialCategory.METAL) {
    // Metal calculations
    if (material.coverageRule.description.includes("Valley")) {
      // Valley metal
      return Math.ceil((measurements.valleyLength || 0) * (1 + actualWasteFactor) / 10);
    } else if (material.coverageRule.description.includes("Drip Edge") || 
               material.coverageRule.description.includes("Drip")) {
      // Drip edge
      const edgeLength = material.coverageRule.description.includes("Eave") ? 
        (measurements.eaveLength || 0) : 
        (measurements.eaveLength || 0) + (measurements.rakeLength || 0);
      return Math.ceil(edgeLength * (1 + actualWasteFactor) / 10);
    } else {
      // Default metal
      return 0;
    }
  } else if (material.category === MaterialCategory.VENTILATION) {
    // Ventilation calculations
    if (material.coverageRule.description.includes("Ridge Vent")) {
      return Math.ceil((measurements.ridgeLength || 0) * (1 + actualWasteFactor) / 4);
    } else if (material.coverageRule.description.includes("Boot")) {
      // Simplified - would need count of penetrations
      return 1;
    } else {
      return 1;
    }
  } else if (material.category === MaterialCategory.LOW_SLOPE) {
    // Calculate low slope area (0:12, 1:12, 2:12)
    const lowSlopeArea = measurements.areasByPitch
      .filter(area => {
        const [rise] = area.pitch.split(':').map(Number);
        return rise <= 2; // 2:12 or less
      })
      .reduce((total, area) => total + area.area, 0);
      
    if (lowSlopeArea <= 0) return 0;
    
    // Apply waste factor to low slope area
    const lowSlopeWithWaste = lowSlopeArea * (1 + actualWasteFactor);
    
    // Different coverage for different low slope materials
    if (material.coverageRule.description.includes("Base")) {
      return Math.ceil(lowSlopeWithWaste / 200); // 2 squares per roll
    } else if (material.coverageRule.description.includes("Cap")) {
      return Math.ceil(lowSlopeWithWaste / 100); // 1 square per roll
    } else {
      return Math.ceil(lowSlopeWithWaste / 150); // Default
    }
  }
  
  // Default fallback - shouldn't reach here in most cases
  return 0;
}

export function calculateMaterialTotal(quantity: number, price: number): number {
  return quantity * price;
}

// Group materials by category for display
export function groupMaterialsByCategory(materials: Material[]): Record<MaterialCategory, Material[]> {
  const groupedMaterials: Record<MaterialCategory, Material[]> = {
    [MaterialCategory.SHINGLES]: [],
    [MaterialCategory.UNDERLAYMENTS]: [],
    [MaterialCategory.LOW_SLOPE]: [],
    [MaterialCategory.METAL]: [],
    [MaterialCategory.VENTILATION]: [],
    [MaterialCategory.ACCESSORIES]: []
  };
  
  materials.forEach(material => {
    groupedMaterials[material.category].push(material);
  });
  
  return groupedMaterials;
}
