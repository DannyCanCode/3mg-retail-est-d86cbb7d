import { Material } from "../../components/estimates/materials/types";
import { MeasurementValues } from "../../components/estimates/measurement/types";
import { LaborRates } from "../../components/estimates/pricing/LaborProfitTab";

/**
 * Estimate cost calculation result structure
 */
export interface EstimateCostResult {
  calculated_material_cost: number;
  calculated_labor_cost: number;
  calculated_subtotal: number;
  calculated_profit_amount: number;
  calculated_total: number;
}

/**
 * Service responsible for all estimate pricing calculations
 */
export class EstimatePricingService {
  /**
   * Calculate the total price of an estimate based on materials, labor rates, and profit margin
   * 
   * @param materials - Record of materials by ID
   * @param quantities - Record of quantities by material ID
   * @param laborRates - Labor rate configuration
   * @param profitMargin - Profit margin percentage
   * @param addonCost - Optional addon cost (e.g., peel & stick)
   * @returns The calculated total price
   */
  public static calculateEstimateTotal(
    materials: Record<string, Material>,
    quantities: Record<string, number>,
    laborRates: LaborRates,
    profitMargin: number,
    addonCost: number = 0
  ): number {
    // Calculate materials cost
    let materialCost = 0;
    for (const materialId in materials) {
      const material = materials[materialId];
      const quantity = quantities[materialId] || 0;
      materialCost += material.price * quantity;
    }
    
    // Add any addon costs
    materialCost += addonCost;

    // Calculate labor cost - this depends on your labor rate structure
    let laborCost = 0;
    if (laborRates.laborRate) {
      // Simple labor calculation
      laborCost = laborRates.laborRate;
    }

    // Add handload cost if applicable
    if (laborRates.isHandload && laborRates.handloadRate) {
      laborCost += laborRates.handloadRate;
    }

    // Add dumpster cost if applicable
    if (laborRates.dumpsterCount && laborRates.dumpsterRate) {
      laborCost += laborRates.dumpsterCount * laborRates.dumpsterRate;
    }

    // Add permit cost if applicable
    if (laborRates.includePermits && laborRates.permitRate) {
      laborCost += laborRates.permitRate;
    }

    // Calculate subtotal
    const subtotal = materialCost + laborCost;

    // Apply profit margin by adding the profit amount to the subtotal
    const profitAmount = subtotal * (profitMargin / 100);
    const total = subtotal + profitAmount;

    console.log("[EstimatePricingService] Calculate Estimate Total:", {
      materialCost,
      laborCost,
      subtotal,
      profitMargin,
      profitAmount,
      total
    });

    return Math.round(total); // Round to nearest dollar
  }

  /**
   * Calculate the detailed costs for an estimate
   * Includes material, labor, subtotal, profit amount, and total
   * 
   * @param measurements - Roof measurements
   * @param materials - Record of materials by ID
   * @param quantities - Record of quantities by material ID
   * @param laborRates - Labor rate configuration
   * @param profitMargin - Profit margin percentage
   * @param addonCost - Optional addon cost (e.g., peel & stick)
   * @returns The detailed cost calculation result
   */
  public static calculateDetailedCosts(
    measurements: MeasurementValues,
    materials: Record<string, Material>,
    quantities: Record<string, number>,
    laborRates: LaborRates,
    profitMargin: number,
    addonCost: number = 0
  ): EstimateCostResult {
    console.log("[calculateDetailedCosts] Starting detailed cost calculation");
    
    // Default to safe values
    const safeMeasurements = measurements || { totalArea: 0, areasByPitch: [] };
    
    // --- Material Cost Calculation ---
    let calculated_material_cost = 0;
    try {
      for (const materialId in materials) {
        const material = materials[materialId];
        const quantity = quantities[materialId] || 0;
        console.log(`[calculateDetailedCosts] Processing Material: ID=${materialId}, Qty=${quantity}, Price=${material?.price}`);
        
        // Ensure material and price exist and are valid numbers
        if (material && typeof material.price === 'number' && !isNaN(material.price) && 
            typeof quantity === 'number' && !isNaN(quantity)) {
          calculated_material_cost += material.price * quantity;
        } else {
          console.warn(`[calculateDetailedCosts] Skipping invalid material/quantity: ID=${materialId}, Price=${material?.price}, Qty=${quantity}`);
        }
      }
    } catch (matError) {
      console.error("[calculateDetailedCosts] Error during material cost calculation:", matError);
      throw new Error("Material cost calculation failed."); 
    }
    
    // Add addon cost
    calculated_material_cost += addonCost;

    // --- Labor Cost Calculation --- 
    let calculated_labor_cost = 0;
    const totalArea = safeMeasurements.totalArea || 0;
    const totalSquares = totalArea > 0 ? totalArea / 100 : 0;
    const wasteFactor = (laborRates.wastePercentage || 12) / 100; // Default 12%

    // Calculate pitch-based labor
    if (safeMeasurements.areasByPitch && Array.isArray(safeMeasurements.areasByPitch) && safeMeasurements.areasByPitch.length > 0 && totalSquares > 0) {
      safeMeasurements.areasByPitch.forEach(area => {
        const pitch = area.pitch;
        const areaSquares = (area.area || 0) / 100;
        if (areaSquares > 0) {
          const rate = this.getPitchRate(pitch, materials, laborRates);
          calculated_labor_cost += rate * areaSquares * (1 + wasteFactor);
          console.log(`[calculateDetailedCosts] Labor for Pitch ${pitch}: ${areaSquares.toFixed(2)} sq @ $${rate}/sq (w/ waste) = $${(rate * areaSquares * (1 + wasteFactor)).toFixed(2)}`);
        }
      });
    } else if (totalSquares > 0) {
      // Fallback if no pitch data but total area exists
      const fallbackRate = laborRates.laborRate || 85;
      calculated_labor_cost += fallbackRate * totalSquares * (1 + wasteFactor);
      console.log(`[calculateDetailedCosts] Labor Fallback: ${totalSquares.toFixed(2)} sq @ $${fallbackRate}/sq (w/ waste) = $${(fallbackRate * totalSquares * (1 + wasteFactor)).toFixed(2)}`);
    }

    // Add Handload
    if (laborRates.isHandload && totalSquares > 0) {
      const handloadCost = (laborRates.handloadRate || 15) * totalSquares * (1 + wasteFactor);
      calculated_labor_cost += handloadCost;
      console.log(`[calculateDetailedCosts] Added Handload: $${handloadCost.toFixed(2)}`);
    }

    // Add Dumpsters
    const dumpsterCount = laborRates.dumpsterCount || (totalSquares > 0 ? Math.max(1, Math.ceil(totalSquares / 20)) : 0);
    if (dumpsterCount > 0) {
      const dumpsterRate = laborRates.dumpsterRate || (laborRates.dumpsterLocation === "orlando" ? 400 : 500);
      const dumpsterTotalCost = dumpsterCount * dumpsterRate;
      calculated_labor_cost += dumpsterTotalCost;
      console.log(`[calculateDetailedCosts] Added Dumpsters (${dumpsterCount}): $${dumpsterTotalCost.toFixed(2)}`);
    }

    // Add Permits
    if (laborRates.includePermits) {
      const permitCount = laborRates.permitCount || 1;
      const basePermitRate = laborRates.permitRate || (laborRates.dumpsterLocation === "orlando" ? 450 : 550);
      const additionalPermitRate = laborRates.permitAdditionalRate || basePermitRate;
      const permitTotalCost = basePermitRate + Math.max(0, permitCount - 1) * additionalPermitRate;
      calculated_labor_cost += permitTotalCost;
      console.log(`[calculateDetailedCosts] Added Permits (${permitCount}): $${permitTotalCost.toFixed(2)}`);
    }

    // Add Gutters
    if (laborRates.includeGutters && laborRates.gutterLinearFeet && laborRates.gutterLinearFeet > 0) {
      const gutterCost = (laborRates.gutterRate || 8) * laborRates.gutterLinearFeet;
      calculated_labor_cost += gutterCost;
      console.log(`[calculateDetailedCosts] Added Gutters (${laborRates.gutterLinearFeet} ft): $${gutterCost.toFixed(2)}`);
    }

    // Add Downspouts
    if (laborRates.includeDownspouts && laborRates.downspoutCount && laborRates.downspoutCount > 0) {
      const downspoutCost = (laborRates.downspoutRate || 75) * laborRates.downspoutCount;
      calculated_labor_cost += downspoutCost;
      console.log(`[calculateDetailedCosts] Added Downspouts (${laborRates.downspoutCount}): $${downspoutCost.toFixed(2)}`);
    }

    // Add Detach/Reset Gutters 
    if (laborRates.includeDetachResetGutters && laborRates.detachResetGutterLinearFeet && laborRates.detachResetGutterLinearFeet > 0) {
      const detachCost = (laborRates.detachResetGutterRate || 1) * laborRates.detachResetGutterLinearFeet;
      calculated_labor_cost += detachCost;
      console.log(`[calculateDetailedCosts] Added Detach/Reset Gutters (${laborRates.detachResetGutterLinearFeet} ft): $${detachCost.toFixed(2)}`);
    }

    // --- Subtotal and Profit --- 
    const calculated_subtotal = calculated_material_cost + calculated_labor_cost;
    const calculated_profit_amount = calculated_subtotal * (profitMargin / 100);
    const calculated_total = calculated_subtotal + calculated_profit_amount;

    console.log("[calculateDetailedCosts] Final calculated values:", { 
      calculated_material_cost, 
      calculated_labor_cost, 
      calculated_subtotal, 
      calculated_profit_amount, 
      calculated_total 
    });

    return {
      calculated_material_cost,
      calculated_labor_cost,
      calculated_subtotal,
      calculated_profit_amount,
      calculated_total 
    };
  }

  /**
   * Helper method to determine the labor rate based on pitch
   * 
   * @param pitch - Roof pitch (e.g., "4/12")
   * @param materials - Record of materials by ID to check for special materials
   * @param laborRates - Labor rate configuration
   * @returns The labor rate for the given pitch
   */
  private static getPitchRate(
    pitch: string, 
    materials: Record<string, Material>, 
    laborRates: LaborRates
  ): number {
    const pitchValue = parseInt(pitch.split(/[:\/]/)[0]) || 0;
    
    // Special material checks
    const hasPolyIso = Object.values(materials).some(m => m.id === "gaf-poly-iso-4x8");
    const hasPolyglass = Object.values(materials).some(m => 
      m.id === "polyglass-elastoflex-sbs" || m.id === "polyglass-polyflex-app"
    );

    // Apply specialized rates based on pitch and materials
    if (pitchValue === 0 && hasPolyIso) return 60; // GAF Poly ISO rate
    if ((pitchValue === 1 || pitchValue === 2) && hasPolyglass) return 109; // Polyglass rate
    if (pitchValue <= 2) return 75; // Default Low Slope
    
    // Steep slope (8/12 and higher) has increasing rates
    if (pitchValue >= 8) {
      const basePitchValue = 8;
      const baseRate = 90;
      const increment = 5;
      return baseRate + (pitchValue - basePitchValue) * increment;
    }
    
    // Standard slope (3/12-7/12) has the default rate
    return laborRates.laborRate || 85;
  }
} 