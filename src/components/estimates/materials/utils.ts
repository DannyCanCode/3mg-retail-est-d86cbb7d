import { Material, MaterialCategory } from "./types";
import { MeasurementValues } from "../measurement/types";

export const calculateMaterialQuantity = (
  material: Material,
  measurements: MeasurementValues,
  wasteFactor: number = 0.1
): number => {
  // Add initial log
  console.log(`[CalcQuantity] Calculating for: ${material.id} (${material.name})`);
  console.log(`[CalcQuantity] Received Measurements:`, JSON.stringify(measurements, null, 2));
  console.log(`[CalcQuantity] Received wasteFactor: ${wasteFactor}`);

  // Make sure we have valid measurements
  if (!measurements || !measurements.totalArea) {
    console.log(`[CalcQuantity] Invalid base measurements (totalArea: ${measurements?.totalArea}), returning 0.`);
    return 0;
  }

  let quantity = 0;

  // For shingles, use the total area (square footage) OR lengths
  if (material.category === MaterialCategory.SHINGLES) {
    // --- Ridge/Hip Cap Shingles --- 
    if (material.id.includes('seal-a-ridge') || material.id.includes('hip-ridge')) {
      const ridgeLength = measurements.ridgeLength || 0;
      const hipLength = measurements.hipLength || 0;
      const totalLength = ridgeLength + hipLength;
      // Extract LF per bundle from description (e.g., "20 LF/Bundle", "25 LF/Bundle")
      const lfPerBundle = extractCoverageValue(material.coverageRule.description) || 25; // Default 25 if extraction fails
      console.log(`[CalcQuantity] Ridge/Hip: RL=${ridgeLength}, HL=${hipLength}, TotalL=${totalLength}, LF/Bundle=${lfPerBundle}`);
      if (lfPerBundle === 0) { quantity = 1; } 
      else { quantity = Math.ceil((totalLength * (1 + wasteFactor)) / lfPerBundle); }
      console.log(`[CalcQuantity] Ridge/Hip Result: ${quantity}`);
    }

    // --- Starter Shingles --- 
    else if (material.id.includes('starter')) {
      let totalLength = 0;
      let calculationBasis = "";
      // GAF ProStart uses Eaves only based on its rule
      if (material.id === 'gaf-prostart-starter-shingle-strip') {
        totalLength = measurements.eaveLength || 0;
        calculationBasis = `Eaves (${totalLength} LF)`;
      } else {
        // Other starters (like OC) might use Eaves + Rakes
        totalLength = (measurements.eaveLength || 0) + (measurements.rakeLength || 0);
        calculationBasis = `Eaves (${measurements.eaveLength || 0} LF) + Rakes (${measurements.rakeLength || 0} LF) = ${totalLength} LF`;
      }
      // Extract LF per bundle from description (e.g., "110 LF/Bundle", "120 LF/Bundle")
      const lfPerBundle = extractCoverageValue(material.coverageRule.description) || 120; // Default 120
      console.log(`[CalcQuantity] Starter: Basis=${calculationBasis}, LF/Bundle=${lfPerBundle}`);
      if (lfPerBundle === 0) { quantity = 1; } 
      else { quantity = Math.ceil((totalLength * (1 + wasteFactor)) / lfPerBundle); }
      console.log(`[CalcQuantity] Starter Result: ${quantity}`);
    }

    // --- Standard Field Shingles (by Area) --- 
    else {
      // Calculate STEEP SLOPE area only (pitch >= 3/12)
      let steepSlopeArea = 0;
      if (measurements.areasByPitch && Array.isArray(measurements.areasByPitch)) {
        steepSlopeArea = measurements.areasByPitch
          .filter(area => {
            // Extract the rise value from pitch string (e.g., "5/12" -> 5)
            const pitchParts = area.pitch.split(/[:\/]/);
            const rise = parseInt(pitchParts[0] || '0');
            return !isNaN(rise) && rise >= 3; // Check if rise is a number and >= 3
          })
          .reduce((sum, area) => sum + (area.area || 0), 0); // Sum the areas
      } else {
         console.warn(`[CalcQuantity] Field Shingle: areasByPitch missing or not an array. Using totalArea as fallback.`);
         // Fallback to totalArea if pitch data is missing/invalid (though initial check should prevent this)
         steepSlopeArea = measurements.totalArea || 0;
      }
      
      console.log(`[CalcQuantity] Field Shingle: Using Steep Slope Area=${steepSlopeArea.toFixed(1)} sq ft`);

      if (steepSlopeArea <= 0) {
          console.log(`[CalcQuantity] Field Shingle: Steep slope area is 0, returning 0 quantity.`);
          quantity = 0;
      } else {
          const steepSlopeSquares = steepSlopeArea / 100;
          const bundlesPerSquare = material.coverageRule.description.includes("3 Bundles/Square") ? 3 : 
                                  (material.unit === 'bundle' ? 3 : 1); 
          console.log(`[CalcQuantity] Field Shingle: SteepSquares=${steepSlopeSquares.toFixed(2)}, Bundles/Sq=${bundlesPerSquare}`);
          quantity = Math.ceil(steepSlopeSquares * bundlesPerSquare * (1 + wasteFactor));
      }
      console.log(`[CalcQuantity] Field Shingle Result: ${quantity}`);
    }
  }
  
  // For underlayment, typically one roll covers 4 squares (400 sq ft)
  if (material.category === MaterialCategory.UNDERLAYMENTS) {
    let calculationArea = 0;
    
    // Special case for ABC Pro Guard 20 (Rhino) - only applies to steep slopes
    if (material.id === "abc-pro-guard-20") {
      console.log(`[CalcQuantity] Underlayment ${material.id}: Applying to steep slopes only.`);
      if (measurements.areasByPitch && Array.isArray(measurements.areasByPitch)) {
        calculationArea = measurements.areasByPitch
          .filter(area => {
            const pitchParts = area.pitch.split(/[:\\/]/);
            const rise = parseInt(pitchParts[0] || '0');
            return !isNaN(rise) && rise >= 3; // Check if rise is a number and >= 3
          })
          .reduce((sum, area) => sum + (area.area || 0), 0); // Sum the areas
        
        if (calculationArea <= 0) {
          console.log(`[CalcQuantity] Underlayment ${material.id}: No steep slope area found, quantity will be 0.`);
        }
      } else {
        console.warn(`[CalcQuantity] Underlayment ${material.id}: areasByPitch missing or not an array. Cannot calculate steep slope area, quantity will be 0.`);
        calculationArea = 0; // Ensure quantity is 0 if pitch data is missing
      }
    } else {
      // For other underlayments, use the total area
      console.log(`[CalcQuantity] Underlayment ${material.id}: Using total area.`);
      calculationArea = measurements.totalArea;
    }

    console.log(`[CalcQuantity] Underlayment: Using Area=${calculationArea.toFixed(1)} sq ft`);
    
    if (calculationArea <= 0) {
      quantity = 0; // Ensure quantity is 0 if calculation area is 0
    } else {
      const totalSquares = calculationArea / 100;
      // Extract coverage per roll (e.g., 4.5 for Rhino, 10 for Feltbuster, 1.5 for Ice&Water)
      const squaresPerRoll = material.coverageAmount || extractCoverageValue(material.coverageRule.description) || 4; 
      console.log(`[CalcQuantity] Underlayment: Squares=${totalSquares.toFixed(2)}, Sq/Roll=${squaresPerRoll}`);
      // Apply waste factor ONLY if using total area (usually not applied to underlayment, but included for consistency)
      // If specific underlayments have different waste rules, add more conditions here.
      const finalSquares = totalSquares * (1 + (material.id !== "abc-pro-guard-20" ? wasteFactor : 0)); // No waste factor for Rhino on steep slope? Review needed.
      quantity = Math.ceil(finalSquares / squaresPerRoll);
    }
    
    console.log(`[CalcQuantity] Underlayment Result: ${quantity}`);
  }
  
  // For low slope materials, only apply to specific pitch areas
  if (material.category === MaterialCategory.LOW_SLOPE) {
    if (!measurements.areasByPitch || !Array.isArray(measurements.areasByPitch) || measurements.areasByPitch.length === 0) {
      console.log(`[CalcQuantity] Invalid low slope measurements, returning 0.`);
      return 0;
    }
    
    const lowSlopeArea = measurements.areasByPitch
      .filter(area => {
        const pitch = area.pitch.toLowerCase();
        return pitch === "0:12" || pitch === "1:12" || pitch === "2:12" || 
               pitch === "0/12" || pitch === "1/12" || pitch === "2/12";
      })
      .reduce((total, area) => total + area.area, 0);
    
    if (lowSlopeArea <= 0) {
      console.log(`[CalcQuantity] Low slope area is 0, returning 0.`);
      return 0;
    }
    
    // Apply waste factor to low slope area
    const lowSlopeWithWaste = lowSlopeArea * (1 + wasteFactor);
    
    if (material.id === "polyglass-elastoflex-sbs") {
      // Corrected divisor based on 1.60 rolls/sq = 0.625 sq/roll
      quantity = Math.ceil(lowSlopeWithWaste / 0.625); 
    } else if (material.id === "polyglass-polyflex-app") {
      // Cap sheet uses 0.8 sq/roll (1.25 rolls/sq)
      quantity = Math.ceil(lowSlopeWithWaste / 0.8); 
    } else if (material.coverageRule.description.includes("Base")) {
      quantity = Math.ceil(lowSlopeWithWaste / 2); // 2 squares per roll (default)
    } else if (material.coverageRule.description.includes("Cap")) {
      quantity = Math.ceil(lowSlopeWithWaste / 1); // 1 square per roll (default)
    } else {
      quantity = Math.ceil(lowSlopeWithWaste / 1.5); // Default 1.5 squares per roll
    }
    console.log(`[CalcQuantity] Low Slope Result: ${quantity}`);
  }
  
  // For accessories, calculate based on coverage rules
  if (material.category === MaterialCategory.ACCESSORIES) {
    const totalSquares = measurements.totalArea / 100;
    const totalSquaresWithWaste = totalSquares * (1 + wasteFactor);
    
    // Check if the material has a specific coverage rule
    if (material.coverageRule && material.coverageRule.description) {
      // For materials that use "per X squares" in their coverage rule (like Master Sealant)
      if (material.coverageRule.description.includes("per 10 squares")) {
        quantity = Math.ceil(totalSquaresWithWaste / 10);
      } else if (material.coverageRule.description.includes("per 15 squares") || 
                material.coverageRule.description.includes("per 10-15 squares")) {
        quantity = Math.ceil(totalSquaresWithWaste / 15);
      } else if (material.coverageRule.description.includes("per 20 squares")) {
        quantity = Math.ceil(totalSquaresWithWaste / 20);
      } else if (material.coverageRule.description.includes("per 30 squares")) {
        quantity = Math.ceil(totalSquaresWithWaste / 30);
      }
    }
    
    // If we couldn't determine from the coverage rule, default to 0 (manual entry)
    quantity = Math.max(0, quantity);
    console.log(`[CalcQuantity] Accessory Result: ${quantity}`);
  }
  
  // Final check and return
  const finalQuantity = Math.max(0, quantity); // Ensure quantity is not negative
  console.log(`[CalcQuantity] Final returned quantity for ${material.id}: ${finalQuantity}`);
  return finalQuantity;
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
