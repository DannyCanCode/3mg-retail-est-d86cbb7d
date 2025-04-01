import { Material, MaterialCategory } from "./types";
import { MeasurementValues } from "../measurement/types";

export const calculateMaterialQuantity = (
  material: Material,
  measurements: MeasurementValues,
  wasteFactor: number = 0.1
): number => {
  // Make sure we have valid measurements
  if (!measurements || !measurements.totalArea) {
    return 0;
  }

  // For shingles, use the total area (square footage)
  if (material.category === MaterialCategory.SHINGLES) {
    const totalSquares = measurements.totalArea / 100;
    
    // Quantity depends on the unit type
    if (material.unit === "bundle") {
      // 3 bundles per square is standard for most shingles
      return Math.ceil(totalSquares * 3 * (1 + wasteFactor));
    } else {
      // Calculate quantity including waste factor
      return Math.ceil(totalSquares * (1 + wasteFactor));
    }
  }
  
  // For underlayment, typically one roll covers 4 squares (400 sq ft)
  if (material.category === MaterialCategory.UNDERLAYMENTS) {
    const totalSquares = measurements.totalArea / 100;
    // Default to 4 squares per roll if not specified in coverageRule
    const squaresPerRoll = material.coverageAmount || 4; 
    return Math.ceil(totalSquares / squaresPerRoll * (1 + wasteFactor));
  }
  
  // For low slope materials, only apply to specific pitch areas
  if (material.category === MaterialCategory.LOW_SLOPE) {
    if (!measurements.areasByPitch || !Array.isArray(measurements.areasByPitch) || measurements.areasByPitch.length === 0) {
      return 0;
    }
    
    const lowSlopeArea = measurements.areasByPitch
      .filter(area => {
        const pitch = area.pitch.toLowerCase();
        return pitch === "0:12" || pitch === "1:12" || pitch === "2:12" || 
               pitch === "0/12" || pitch === "1/12" || pitch === "2/12";
      })
      .reduce((total, area) => total + area.area, 0);
    
    if (lowSlopeArea <= 0) return 0;
    
    // Apply waste factor to low slope area
    const lowSlopeWithWaste = lowSlopeArea * (1 + wasteFactor);
    
    if (material.id === "polyglass-elastoflex-sbs") {
      return Math.ceil(lowSlopeWithWaste / 0.8); // 0.8 squares per roll
    } else if (material.id === "polyglass-polyflex-app") {
      return Math.ceil(lowSlopeWithWaste / 0.8); // 0.8 squares per roll (1.25 rolls per square)
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
