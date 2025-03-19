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
          material.coverageRule.description.includes("Ridge") ||
          material.id.includes("hip-ridge") || 
          material.id.includes("seal-a-ridge")) {
        // Hip and ridge shingles - extract LF per bundle from description
        const lfPerBundle = extractCoverageValue(material.coverageRule.description);
        const ridgeHipLength = (measurements.ridgeLength || 0) + (measurements.hipLength || 0);
        return Math.ceil(ridgeHipLength * (1 + actualWasteFactor) / lfPerBundle);
      } else if (material.coverageRule.description.includes("Starter") || 
                material.id.includes("starter")) {
        // Starter shingles - extract LF per bundle from description
        const lfPerBundle = extractCoverageValue(material.coverageRule.description);
        // If it's specifically eaves only
        if (material.id === "gaf-prostart-starter-shingle-strip") {
          return Math.ceil((measurements.eaveLength || 0) * (1 + actualWasteFactor) / lfPerBundle);
        } else {
          const eaveRakeLength = (measurements.eaveLength || 0) + (measurements.rakeLength || 0);
          return Math.ceil(eaveRakeLength * (1 + actualWasteFactor) / lfPerBundle);
        }
      } else {
        // Default shingle bundle calculation (3 bundles per square)
        return Math.ceil(totalSquares * 3);
      }
    }
  } else if (material.category === MaterialCategory.UNDERLAYMENTS) {
    // Underlayment calculations
    if (material.id === "gaf-weatherwatch-ice-water-shield") {
      // GAF WeatherWatch Ice & Water Shield - 1.5 squares per roll
      return Math.ceil(totalSquares / 1.5);
    } else if (material.id === "gaf-feltbuster-synthetic-underlayment" || 
               material.id === "abc-pro-guard-20") {
      // Use 4.5 squares per roll for these materials
      return Math.ceil(totalSquares / 4.5);
    } else if (material.coverageRule.description.includes("Peel & Stick") || 
        material.coverageRule.description.includes("Weatherwatch")) {
      // Calculate ice & water shield for valleys and eaves
      const valleyArea = (measurements.valleyLength || 0) * 3 * 0.167;
      const eaveArea = (measurements.eaveLength || 0) * 3 * 0.167;
      const totalIceWaterArea = (valleyArea + eaveArea) * (1 + actualWasteFactor);
      return Math.max(Math.ceil(totalIceWaterArea / 200), 1);
    } else {
      // Extract squares per roll from the description
      const squaresPerRoll = extractCoverageValue(material.coverageRule.description);
      return Math.ceil(totalSquares / squaresPerRoll);
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
    
    if (material.id === "polyglass-elastoflex-sbs") {
      return Math.ceil(lowSlopeWithWaste / 0.8); // 0.8 squares per roll
    } else if (material.coverageRule.description.includes("Base")) {
      return Math.ceil(lowSlopeWithWaste / 2); // 2 squares per roll (default)
    } else if (material.coverageRule.description.includes("Cap")) {
      return Math.ceil(lowSlopeWithWaste / 1); // 1 square per roll (default)
    } else {
      return Math.ceil(lowSlopeWithWaste / 1.5); // Default 1.5 squares per roll
    }
  }
  
  // Default fallback - shouldn't reach here in most cases
  return 0;
}

// Helper function to extract numeric values from coverage descriptions
function extractCoverageValue(description: string): number {
  // Try to find a number followed by LF, Squares, etc.
  const match = description.match(/(\d+(\.\d+)?)\s*(LF|Squares|Square)/i);
  if (match && match[1]) {
    return parseFloat(match[1]);
  }
  // Fallback to extracting just the first number
  const numMatch = description.match(/(\d+(\.\d+)?)/);
  if (numMatch && numMatch[1]) {
    return parseFloat(numMatch[1]);
  }
  // Default fallback
  return 10; // Reasonable default
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
