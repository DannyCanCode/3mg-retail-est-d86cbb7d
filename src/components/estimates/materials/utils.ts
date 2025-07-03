import { Material, MaterialCategory } from "./types";
import { MeasurementValues } from "../measurement/types";

// Define default waste factors by category
const DEFAULT_WASTE_FACTORS: Partial<Record<MaterialCategory, number>> = {
  [MaterialCategory.SHINGLES]: 0.12, // 12%
  [MaterialCategory.UNDERLAYMENTS]: 0.10, // 10%
  [MaterialCategory.LOW_SLOPE]: 0.12, // 12%
  [MaterialCategory.METAL]: 0.10, // 10%
  [MaterialCategory.VENTILATION]: 0, // 0%
  [MaterialCategory.ACCESSORIES]: 0, // 0%
};

const GENERAL_DEFAULT_WASTE_FACTOR = 0.10; // Default for categories not listed or if no override

// Interface for fetched database waste percentages
export interface MaterialWastePercentages {
  [materialId: string]: number; // material_id to waste_percentage mapping
}

// Function to determine waste factor based on material, considering DB values
export const determineWasteFactor = (
  material: Material, 
  overrideWasteFactor?: number,
  dbWastePercentages?: MaterialWastePercentages
): number => {
  // If explicit override from UI (per-material or GAF), use that
  if (overrideWasteFactor !== undefined) {
    return overrideWasteFactor;
  }
  
  // If we have database values and this material has a specific override
  if (dbWastePercentages && dbWastePercentages[material.id] !== undefined) {
    return dbWastePercentages[material.id] / 100; // Convert from percentage to decimal
  }
  
  // Fall back to category defaults
  if (material.category === MaterialCategory.VENTILATION || material.category === MaterialCategory.ACCESSORIES) {
    return 0; // Hard-coded 0% for these categories
  }
  
  // Use category default
  return DEFAULT_WASTE_FACTORS[material.category] ?? GENERAL_DEFAULT_WASTE_FACTOR;
};

export const calculateMaterialQuantity = (
  material: Material,
  measurements: MeasurementValues,
  overrideWasteFactor?: number, // This comes from the UI (global or GAF-specific)
  dbWastePercentages?: MaterialWastePercentages // Optional database waste percentages
): { quantity: number; actualWasteFactor: number } => {
  console.log(`[CalcQuantity] Calculating for: ${material.id} (${material.name})`);
  console.log(`[CalcQuantity] Received Measurements:`, JSON.stringify(measurements, null, 2));
  console.log(`[CalcQuantity] Received overrideWasteFactor: ${overrideWasteFactor}`);

  if (!measurements || !measurements.totalArea) {
    console.log(`[CalcQuantity] Invalid base measurements (totalArea: ${measurements?.totalArea}), returning 0.`);
    return { quantity: 0, actualWasteFactor: overrideWasteFactor ?? GENERAL_DEFAULT_WASTE_FACTOR };
  }

  let quantity = 0;
  
  // Determine the waste factor to use with our helper function
  const actualWasteFactor = determineWasteFactor(material, overrideWasteFactor, dbWastePercentages);
  
  console.log(`[CalcQuantity] Material: ${material.id}, Category: ${material.category}, UI Override: ${overrideWasteFactor}, Determined actualWasteFactor: ${actualWasteFactor}`);

  // For shingles, use the total area (square footage) OR lengths
  if (material.category === MaterialCategory.SHINGLES) {
    // --- Ridge/Hip Cap Shingles --- 
    if (material.id.includes('seal-a-ridge') || material.id.includes('hip-ridge')) {
      const ridgeLength = measurements.ridgeLength || 0;
      const hipLength = measurements.hipLength || 0;
      const totalLength = ridgeLength + hipLength;
      const lfPerBundle = extractCoverageValue(material.coverageRule.description) || 25; 
      console.log(`[CalcQuantity] Ridge/Hip: RL=${ridgeLength}, HL=${hipLength}, TotalL=${totalLength}, LF/Bundle=${lfPerBundle}`);
      if (lfPerBundle === 0) { quantity = 1; } 
      else { quantity = Math.ceil((totalLength * (1 + actualWasteFactor)) / lfPerBundle); }
      console.log(`[CalcQuantity] Ridge/Hip Result: ${quantity}`);
    }
    // --- Starter Shingles --- 
    else if (material.id.includes('starter')) {
      let totalLength = 0;
      let calculationBasis = "";
      if (material.id === 'gaf-prostart-starter-shingle-strip') {
        totalLength = measurements.eaveLength || 0;
        calculationBasis = `Eaves (${totalLength} LF)`;
      } else {
        totalLength = (measurements.eaveLength || 0) + (measurements.rakeLength || 0);
        calculationBasis = `Eaves (${measurements.eaveLength || 0} LF) + Rakes (${measurements.rakeLength || 0} LF) = ${totalLength} LF`;
      }
      const lfPerBundle = extractCoverageValue(material.coverageRule.description) || 120;
      console.log(`[CalcQuantity] Starter: Basis=${calculationBasis}, LF/Bundle=${lfPerBundle}`);
      if (lfPerBundle === 0) { quantity = 1; } 
      else { quantity = Math.ceil((totalLength * (1 + actualWasteFactor)) / lfPerBundle); }
      console.log(`[CalcQuantity] Starter Result: ${quantity}`);
    }
    // --- Standard Field Shingles (by Area) --- 
    else {
      let steepSlopeArea = 0;
      if (measurements.areasByPitch && Array.isArray(measurements.areasByPitch)) {
        steepSlopeArea = measurements.areasByPitch
          .filter(area => {
            const pitchParts = area.pitch.split(/[:\\/]/);
            const rise = parseInt(pitchParts[0] || '0');
            return !isNaN(rise) && rise >= 3;
          })
          .reduce((sum, area) => sum + (area.area || 0), 0);
      } else {
         console.warn(`[CalcQuantity] Field Shingle: areasByPitch missing or not an array. Using totalArea as fallback.`);
         steepSlopeArea = measurements.totalArea || 0;
      }
      
      console.log(`[CalcQuantity] Field Shingle: Using Steep Slope Area=${steepSlopeArea.toFixed(1)} sq ft`);

      if (steepSlopeArea <= 0) {
          console.log(`[CalcQuantity] Field Shingle: Steep slope area is 0, returning 0 quantity.`);
          quantity = 0;
      } else {
          const steepSlopeSquares = steepSlopeArea / 100;
          const bundlesPerSquare = material.bundlesPerSquare || (material.coverageRule.description.includes("3 Bundles/Square") ? 3 : (material.unit === 'bundle' ? 3 : 1));
          console.log(`[CalcQuantity] Field Shingle: SteepSquares=${steepSlopeSquares.toFixed(2)}, Bundles/Sq=${bundlesPerSquare}`);
          quantity = Math.ceil(steepSlopeSquares * bundlesPerSquare * (1 + actualWasteFactor));
      }
      console.log(`[CalcQuantity] Field Shingle Result: ${quantity}`);
    }
  }
  
  // For underlayment
  else if (material.category === MaterialCategory.UNDERLAYMENTS) {
    let calculationArea = 0; // This will be area in sq ft for most underlayments
    let quantitySource = "area"; // For logging

    if (material.id === "abc-pro-guard-20") { // Rhino
      quantitySource = "steep slope area";
      console.log(`[CalcQuantity] Underlayment ${material.id}: Applying to steep slopes only.`);
      if (measurements.areasByPitch && Array.isArray(measurements.areasByPitch)) {
        calculationArea = measurements.areasByPitch
          .filter(area => {
            const pitchParts = area.pitch.split(/[:\\/]/);
            const rise = parseInt(pitchParts[0] || '0');
            return !isNaN(rise) && rise >= 3;
          })
          .reduce((sum, area) => sum + (area.area || 0), 0);
        if (calculationArea <= 0) console.log(`[CalcQuantity] Underlayment ${material.id}: No steep slope area found, quantity will be 0.`);
      } else {
        console.warn(`[CalcQuantity] Underlayment ${material.id}: areasByPitch missing. Quantity will be 0.`);
        calculationArea = 0;
      }
    } else if (material.id === "gaf-weatherwatch-ice-water-shield") {
      quantitySource = "valley length";
      console.log(`[CalcQuantity] Underlayment ${material.id}: Calculating based on valley length.`);
      const valleyLength = measurements.valleyLength || 0;
      if (valleyLength > 0) {
        const linearFeetPerRoll = 45.5; // As per existing special logic and UI string
        // Apply waste to the length of material needed
        quantity = Math.ceil((valleyLength * (1 + actualWasteFactor)) / linearFeetPerRoll);
        console.log(`[CalcQuantity] GAF WeatherWatch: ValleyLength=${valleyLength}, Waste=${actualWasteFactor}, LF/Roll=${linearFeetPerRoll}, Qty=${quantity}`);
      } else {
        quantity = 0;
      }
      // This path calculates quantity directly and should bypass the generic area-based calculation below.
      console.log(`[CalcQuantity] Underlayment Result for ${material.id}: ${quantity}`);
      // Return early as quantity is now finalized for this specific material
      return { quantity: Math.max(0, Math.ceil(quantity)), actualWasteFactor };
    } else {
      quantitySource = "total area";
      console.log(`[CalcQuantity] Underlayment ${material.id}: Using total area.`);
      calculationArea = measurements.totalArea;
    }

    // This block is for underlayments calculated by AREA (like Rhino or general underlayments)
    // It will be skipped if GAF WeatherWatch returned early.
    console.log(`[CalcQuantity] Underlayment (${quantitySource}): Using Area=${calculationArea.toFixed(1)} sq ft`);
    
    if (calculationArea <= 0) {
      quantity = 0;
    } else {
      const totalSquares = calculationArea / 100;
      // Default to 4 squares per roll if no specific coverage found, which is 400 sq ft.
      // For GAF WeatherWatch, its description is "1.5 Squares/Roll (150 sq ft)"
      // extractCoverageValue would get 1.5 from description.
      const squaresPerRoll = material.coverageAmount || extractCoverageValue(material.coverageRule.description) || 4; 
      console.log(`[CalcQuantity] Underlayment: Squares=${totalSquares.toFixed(2)}, Sq/Roll=${squaresPerRoll}`);
      // For underlayment, only apply waste if it's NOT abc-pro-guard-20 (Rhino) because Rhino already factors its specific area.
      // GAF WeatherWatch also handles its own waste application in the block above.
      const wasteToApply = (material.id === "abc-pro-guard-20" || material.id === "gaf-weatherwatch-ice-water-shield") ? 0 : actualWasteFactor;
      const finalSquares = totalSquares * (1 + wasteToApply);
      quantity = Math.ceil(finalSquares / squaresPerRoll);
    }
    console.log(`[CalcQuantity] Underlayment Result (Area-based for ${material.id}): ${quantity}`);
  }
  
  // For low slope materials
  else if (material.category === MaterialCategory.LOW_SLOPE) {
    if (!measurements.areasByPitch || !Array.isArray(measurements.areasByPitch) || measurements.areasByPitch.length === 0) {
      console.log(`[CalcQuantity] Invalid low slope measurements, returning 0.`);
      return { quantity: 0, actualWasteFactor };
    }
    
    const getPitchRise = (pitchString: string): number => {
      if (!pitchString) return 0;
      const parts = pitchString.split(/[:\\/]/);
      return parseInt(parts[0] || '0');
    };

    // 🔧 FIXED: Separate calculations based on specific material requirements
    
    if (material.id === "gaf-poly-iso-4x8") {
        // ISO is ONLY required for 0/12 pitch areas
        const zeroPitchArea = measurements.areasByPitch
          ?.filter(area => {
             const rise = getPitchRise(area.pitch);
             return !isNaN(rise) && rise === 0;
          })
          .reduce((sum, area) => sum + (area.area || 0), 0) || 0;

        if (zeroPitchArea <= 0) {
            console.log(`[CalcQuantity] 0/12 pitch area is 0, returning 0 for ${material.id}.`);
            return { quantity: 0, actualWasteFactor };
        }
        
        const zeroPitchAreaWithWaste = zeroPitchArea * (1 + actualWasteFactor);
        const squaresNeeded = zeroPitchAreaWithWaste / 100;
        quantity = Math.ceil(squaresNeeded);
        console.log(`[CalcQuantity] ISO (0/12 only): Used ${zeroPitchArea.toFixed(1)} sq ft area, Result: ${quantity} squares`);
        
    } else if (material.id === "polyglass-elastoflex-sbs") {
        // Base Sheet is required for 0/12, 1/12, AND 2/12 pitch areas
        const lowSlopeAreaSqFt = measurements.areasByPitch
          ?.filter(area => {
             const rise = getPitchRise(area.pitch);
             return !isNaN(rise) && rise >= 0 && rise <= 2;
          })
          .reduce((sum, area) => sum + (area.area || 0), 0) || 0;

        if (lowSlopeAreaSqFt <= 0) {
            console.log(`[CalcQuantity] Low slope area (0-2 pitch) is 0, returning 0 for ${material.id}.`);
            return { quantity: 0, actualWasteFactor };
        }

        const lowSlopeAreaWithWaste = lowSlopeAreaSqFt * (1 + actualWasteFactor);
        // 🔧 FIXED: Base covers 114 sq ft per roll → Low-slope area ÷ 114
        const coverageSqFtPerRoll = 114;
        quantity = Math.ceil(lowSlopeAreaWithWaste / coverageSqFtPerRoll);
        console.log(`[CalcQuantity] SBS Base (0-2 pitch): Used ${lowSlopeAreaSqFt.toFixed(1)} sq ft area, ÷ ${coverageSqFtPerRoll} sq ft/roll = ${quantity} rolls`);
        
    } else if (material.id === "polyglass-polyflex-app") {
        // Cap Sheet is required for 0/12, 1/12, AND 2/12 pitch areas  
        const lowSlopeAreaSqFt = measurements.areasByPitch
          ?.filter(area => {
             const rise = getPitchRise(area.pitch);
             return !isNaN(rise) && rise >= 0 && rise <= 2;
          })
          .reduce((sum, area) => sum + (area.area || 0), 0) || 0;

        if (lowSlopeAreaSqFt <= 0) {
            console.log(`[CalcQuantity] Low slope area (0-2 pitch) is 0, returning 0 for ${material.id}.`);
            return { quantity: 0, actualWasteFactor };
        }

        const lowSlopeAreaWithWaste = lowSlopeAreaSqFt * (1 + actualWasteFactor);
        // 🔧 FIXED: Cap covers 100 sq ft per roll → Low-slope area ÷ 100 
        const coverageSqFtPerRoll = 100;
        quantity = Math.ceil(lowSlopeAreaWithWaste / coverageSqFtPerRoll);
        console.log(`[CalcQuantity] APP Cap (0-2 pitch): Used ${lowSlopeAreaSqFt.toFixed(1)} sq ft area, ÷ ${coverageSqFtPerRoll} sq ft/roll = ${quantity} rolls`);
        
    } else {
      // Fallback for other low slope materials
      const lowSlopeAreaSqFt = measurements.areasByPitch
        ?.filter(area => {
           const rise = getPitchRise(area.pitch);
           return !isNaN(rise) && rise >= 0 && rise <= 2;
        })
        .reduce((sum, area) => sum + (area.area || 0), 0) || 0;

      if (lowSlopeAreaSqFt <= 0) {
        console.log(`[CalcQuantity] Low slope area is 0, returning 0 for ${material.id}.`);
        return { quantity: 0, actualWasteFactor };
      }

      const lowSlopeAreaWithWaste = lowSlopeAreaSqFt * (1 + actualWasteFactor);
      const coverageSqFtPerRoll = material.coveragePerUnit || 150;
      quantity = Math.ceil(lowSlopeAreaWithWaste / coverageSqFtPerRoll);
      console.log(`[CalcQuantity] Other Low Slope: ${quantity} using ${lowSlopeAreaSqFt.toFixed(1)} sq ft`);
    }
  }
  
  // For Metal category
  else if (material.category === MaterialCategory.METAL) {
    // Assuming metal roofing is based on total area or specific lengths
    // This section needs specific logic based on how metal roofing components are calculated.
    // For now, let's assume it's based on total area like some underlayments if no specific rule.
    const totalSquares = measurements.totalArea / 100;
    const coveragePerUnit = material.coveragePerUnit || 1; // e.g., sheets per square, or sq ft per piece
    const totalAreaWithWaste = measurements.totalArea * (1 + actualWasteFactor);
    
    if (material.id.includes('drip-edge')) {
        const dripEdgeLength = measurements.dripEdgeLength || 0;
        const lengthPerPiece = extractCoverageValue(material.coverageRule.description) || 10; // assume 10ft pieces
        quantity = Math.ceil((dripEdgeLength * (1 + actualWasteFactor)) / lengthPerPiece);
    } else if (material.id.includes('flashing')) { // Generic flashing
        const flashingLength = (measurements.flashingLength || 0) + (measurements.stepFlashingLength || 0);
        const lengthPerPiece = extractCoverageValue(material.coverageRule.description) || 10; // assume 10ft pieces
        quantity = Math.ceil((flashingLength * (1 + actualWasteFactor)) / lengthPerPiece);
    } else {
        // Default for other metal items, perhaps based on total squares or specific logic
        // This might need more specific rules in ROOFING_MATERIALS.ts
        quantity = Math.ceil(totalAreaWithWaste / (coveragePerUnit * 100)); // if coveragePerUnit is in squares
    }
    console.log(`[CalcQuantity] Metal Material ${material.id} Result: ${quantity}`);
  }

  // For accessories, waste factor is generally not applied directly in quantity calculation,
  // or it's a fixed quantity. If actualWasteFactor is > 0, it means an override was intended.
  else if (material.category === MaterialCategory.ACCESSORIES) {
    const totalSquares = measurements.totalArea / 100;
    // Use actualWasteFactor if it's an override, otherwise, accessories usually don't have waste applied in calculation
    const calculationWasteFactor = overrideWasteFactor !== undefined ? actualWasteFactor : 0;
    const totalSquaresWithAppliedWaste = totalSquares * (1 + calculationWasteFactor);
    
    if (material.coverageRule && material.coverageRule.description) {
      if (material.coverageRule.description.includes("per 10 squares")) {
        quantity = Math.ceil(totalSquaresWithAppliedWaste / 10);
      } else if (material.coverageRule.description.includes("per 15 squares") || 
                material.coverageRule.description.includes("per 10-15 squares")) {
        quantity = Math.ceil(totalSquaresWithAppliedWaste / 15);
      } else if (material.coverageRule.description.includes("per 20 squares")) {
        quantity = Math.ceil(totalSquaresWithAppliedWaste / 20);
      } else if (material.coverageRule.description.includes("per 30 squares")) {
        quantity = Math.ceil(totalSquaresWithAppliedWaste / 30);
      } else if (material.id === 'karnak-19') { // Karnak 19 flashing cement
        // 1 bucket per ~500 sq ft, applied to low slope area if present, otherwise total area.
        let areaForKarnak19 = measurements.areasByPitch?.filter(a => parseInt(a.pitch.split(/[:\\/]/)[0]) <= 2).reduce((s, a) => s + (a.area || 0), 0) || 0;
        if (areaForKarnak19 === 0) areaForKarnak19 = measurements.totalArea; // Fallback to total area if no low slope
        quantity = Math.max(1, Math.ceil(areaForKarnak19 / 500));
      } else if (material.id === 'karnak-asphalt-primer-spray') {
        let areaForSpray = measurements.areasByPitch?.filter(a => parseInt(a.pitch.split(/[:\\/]/)[0]) <= 2).reduce((s, a) => s + (a.area || 0), 0) || 0;
        if (areaForSpray === 0) areaForSpray = measurements.totalArea;
        quantity = areaForSpray > 200 ? 4 : 2; // 4 cans for large areas, 2 for smaller
      } else {
        // Default for other accessories, might need specific logic or be manual
        quantity = 0; // Defaulting to 0 for unhandled accessories
      }
    } else {
      quantity = 0; // Defaulting to 0 if no coverage rule
    }
    
    quantity = Math.max(0, quantity);
    console.log(`[CalcQuantity] Accessory Result: ${quantity}, Waste Applied: ${calculationWasteFactor}`);
  }
  
  // For Ventilation, waste is 0
  else if (material.category === MaterialCategory.VENTILATION) {
    // Ventilation calculations are usually based on NFA requirements or specific rules
    // For example, GAF Cobra Rigid Vent covers 4ft per piece. Ridge length is a good basis.
    if (material.id === 'gaf-cobra-rigid-vent') {
        const ridgeLength = measurements.ridgeLength || 0;
        const lengthPerPiece = 4; // feet
        quantity = Math.ceil(ridgeLength / lengthPerPiece);
    } else {
        // Other ventilation products might be per unit or have different rules
        quantity = 0; // Default to 0 for unhandled ventilation, often these are counted items
    }
    console.log(`[CalcQuantity] Ventilation Result: ${quantity}`);
  }

  const finalQuantity = Math.max(0, Math.ceil(quantity)); 
  console.log(`[CalcQuantity] Final returned quantity for ${material.id}: ${finalQuantity}, with actualWasteFactor: ${actualWasteFactor}`);
  return { quantity: finalQuantity, actualWasteFactor };
};

// Helper function to extract numeric values from coverage descriptions
// Extracts the first number, or a number followed by LF, Sq, Square, etc.
function extractCoverageValue(description: string): number | null {
  if (!description) return null;
  // Regex to find numbers (integers or decimals) possibly followed by units
  const match = description.match(/(\d+(\.\d+)?)\s*(?:sq|square|lf|ft|rolls|roll|bundles|bundle|sheets|sheet|each|pc|per|gal|gallon|tube|oz|lb)?/i);
  if (match && match[1]) {
    return parseFloat(match[1]);
  }
  return null; // Return null if no number is found
}


export function calculateMaterialTotal(quantity: number, price: number): number {
  return quantity * price;
}

// Group materials by category for display
export function groupMaterialsByCategory(materials: Material[]): Record<string, Material[]> {
  const categoryOrder: MaterialCategory[] = [
    MaterialCategory.SHINGLES,
    MaterialCategory.UNDERLAYMENTS,
    MaterialCategory.LOW_SLOPE,
    MaterialCategory.METAL,
    MaterialCategory.VENTILATION,
    MaterialCategory.ACCESSORIES,
  ];

  // Initialize with all known categories explicitly in a specific order
  const groupedMaterials: Record<string, Material[]> = {};
  categoryOrder.forEach(cat => {
    groupedMaterials[cat] = [];
  });
  
  materials.forEach(material => {
    if (material.category && categoryOrder.includes(material.category)) {
      groupedMaterials[material.category].push(material);
    } else {
      console.warn(`Material \"${material.name}\" (ID: ${material.id}) has unknown or missing category: ${material.category}. Skipping grouping.`);
      // if (!groupedMaterials["OTHER"]) {
      //   groupedMaterials["OTHER"] = [];
      // }
      // groupedMaterials["OTHER"].push(material);
    }
  });
  
  // Filter out empty categories from the final result for cleaner display, unless it's a predefined category
  // For example, always show SHINGLES even if empty, but not "OTHER" if it's empty
  const finalGroupedMaterials: Record<string, Material[]> = {};
  for (const category of categoryOrder) {
      if (groupedMaterials[category] && (groupedMaterials[category].length > 0 || categoryOrder.includes(category))) {
          finalGroupedMaterials[category] = groupedMaterials[category];
      }
  }
  // if (groupedMaterials["OTHER"] && groupedMaterials["OTHER"].length > 0) {
  //   finalGroupedMaterials["OTHER"] = groupedMaterials["OTHER"];
  // }
  
  return finalGroupedMaterials;
}
