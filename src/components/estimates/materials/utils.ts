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

  // For shingles, use the total area (square footage) OR lengths
  if (material.category === MaterialCategory.SHINGLES) {
    // --- Ridge/Hip Cap Shingles --- 
    if (material.id.includes('seal-a-ridge') || material.id.includes('hip-ridge')) {
      const ridgeLength = measurements.ridgeLength || 0;
      const hipLength = measurements.hipLength || 0;
      const totalLength = ridgeLength + hipLength;
      // Extract LF per bundle from description (e.g., "20 LF/Bundle", "25 LF/Bundle")
      const lfPerBundle = extractCoverageValue(material.coverageRule.description) || 25; // Default 25 if extraction fails
      if (lfPerBundle === 0) return 1; // Avoid division by zero, return 1 bundle minimum
      // Add waste factor to length calculations too
      return Math.ceil((totalLength * (1 + wasteFactor)) / lfPerBundle);
    }

    // --- Starter Shingles --- 
    else if (material.id.includes('starter')) {
      let totalLength = 0;
      // GAF ProStart uses Eaves only based on its rule
      if (material.id === 'gaf-prostart-starter-shingle-strip') {
        totalLength = measurements.eaveLength || 0;
      } else {
        // Other starters (like OC) might use Eaves + Rakes
        totalLength = (measurements.eaveLength || 0) + (measurements.rakeLength || 0);
      }
      // Extract LF per bundle from description (e.g., "110 LF/Bundle", "120 LF/Bundle")
      const lfPerBundle = extractCoverageValue(material.coverageRule.description) || 120; // Default 120
      if (lfPerBundle === 0) return 1;
      // Add waste factor to length calculations
      return Math.ceil((totalLength * (1 + wasteFactor)) / lfPerBundle);
    }

    // --- Standard Field Shingles (by Area) --- 
    else {
      const totalSquares = measurements.totalArea / 100;
      // Most field shingles are 3 bundles/square
      // Check description just in case, but default to 3
      const bundlesPerSquare = material.coverageRule.description.includes("3 Bundles/Square") ? 3 : 
                              (material.unit === 'bundle' ? 3 : 1); // Default guess
                              
      return Math.ceil(totalSquares * bundlesPerSquare * (1 + wasteFactor));
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
  
  // For accessories, calculate based on coverage rules
  if (material.category === MaterialCategory.ACCESSORIES) {
    const totalSquares = measurements.totalArea / 100;
    const totalSquaresWithWaste = totalSquares * (1 + wasteFactor);
    
    // Check if the material has a specific coverage rule
    if (material.coverageRule && material.coverageRule.description) {
      // For materials that use "per X squares" in their coverage rule (like Master Sealant)
      if (material.coverageRule.description.includes("per 10 squares")) {
        return Math.ceil(totalSquaresWithWaste / 10);
      } else if (material.coverageRule.description.includes("per 15 squares") || 
                material.coverageRule.description.includes("per 10-15 squares")) {
        return Math.ceil(totalSquaresWithWaste / 15);
      } else if (material.coverageRule.description.includes("per 20 squares")) {
        return Math.ceil(totalSquaresWithWaste / 20);
      } else if (material.coverageRule.description.includes("per 30 squares")) {
        return Math.ceil(totalSquaresWithWaste / 30);
      }
    }
    
    // If we couldn't determine from the coverage rule, default to 0 (manual entry)
    return 0;
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
