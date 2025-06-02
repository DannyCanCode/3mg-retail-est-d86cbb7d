import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { MeasurementValues } from "@/components/estimates/measurement/types";
import { Material } from "@/components/estimates/materials/types";
import { LaborRates } from "@/components/estimates/pricing/LaborProfitTab";

// Define the status type for estimates
export type EstimateStatus = "draft" | "pending" | "approved" | "rejected" | "Sold";

// Complete estimate interface that represents what's stored in the database
export interface Estimate {
  id?: string;
  customer_name?: string;
  customer_address: string;
  customer_email?: string;
  customer_phone?: string;
  measurement_id?: string;
  total_price: number;
  materials: Record<string, Material>;
  quantities: Record<string, number>;
  labor_rates: LaborRates;
  profit_margin: number;
  measurements: MeasurementValues;
  status: EstimateStatus;
  created_at?: string;
  updated_at?: string;
  notes?: string;
  is_sold?: boolean;
  sold_at?: string;
  calculated_material_cost?: number;
  calculated_labor_cost?: number;
  calculated_subtotal?: number;
  calculated_profit_amount?: number;
  job_type?: 'Retail' | 'Insurance' | null;
  insurance_company?: string | null;
  peel_stick_addon_cost?: number;
}

// Helper function for safe stringification (if not already global to this file)
// const safeStringify = (obj: any): string => { ... };

/**
 * Save a new estimate to the database with "pending" status
 */
export const saveEstimate = async (
  estimateInput: Partial<Estimate> & { id?: string } 
): Promise<{ data: Estimate | null; error: Error | null; }> => {
  try {
    if (!isSupabaseConfigured()) {
      console.warn("Supabase not configured, estimate will not be saved to database");
      return { data: null, error: new Error("Supabase not configured") };
    }
    // console.log("Supabase is configured, proceeding with save/update for input:", estimateInput);

    const now = new Date().toISOString();

    const { 
      created_at, 
      updated_at,
      id: inputId,
      // Destructure the fields that were previously stringified, to pass them as objects
      materials: inputMaterials,
      quantities: inputQuantities,
      labor_rates: inputLaborRates,
      measurements: inputMeasurements,
      status: inputStatus,
      ...restOfEstimateInput 
    } = estimateInput;

    // Prepare payload with direct objects/arrays for JSONB fields
    const payload: any = {
      ...restOfEstimateInput,
      materials: inputMaterials || {},
      quantities: inputQuantities || {},
      labor_rates: inputLaborRates || {}, // Consider full default if {} is problematic for LaborRates type elsewhere
      measurements: inputMeasurements || {},
      updated_at: now,
    };
    
    if (inputId) {
      payload.id = inputId;
    }
    if (inputStatus) {
      payload.status = inputStatus;
    }

    let data, error;

    if (inputId) { // UPDATE existing record
      const { created_at: _createdAt, id: _id, ...updatePayload } = payload; // Exclude created_at and id from update payload itself
      console.log("Updating estimate data for ID:", inputId, updatePayload);
      ({ data, error } = await supabase
        .from("estimates")
        .update(updatePayload) 
        .eq("id", inputId)
        .select()
        .single());
    } else { // INSERT new record
      payload.status = inputStatus || "pending";
      payload.created_at = now;
      
      if (!payload.customer_address) {
        throw new Error("Missing required field: customer_address for new estimate");
      }
      if (typeof payload.total_price !== 'number' || isNaN(payload.total_price)) {
        throw new Error(`Invalid total_price for new estimate: ${payload.total_price}`);
      }

      console.log("Inserting new estimate data:", payload);
      ({ data, error } = await supabase
        .from("estimates")
        .insert(payload) 
        .select()
        .single());
    }

    if (error) {
      console.error("Supabase error details:", { code: error.code, message: error.message, details: error.details, hint: error.hint });
      throw error;
    }
    if (!data) {
        return { data: null, error: new Error("No data returned from Supabase after save/update.") };
    }

    // When data comes back from Supabase, JSONB fields might be objects/arrays directly, or still strings
    // depending on the client library and selects. Robust parsing is good.
    const parsedData = {
      ...data,
      status: data.status as EstimateStatus,
      materials: typeof data.materials === 'string' ? JSON.parse(data.materials) : (data.materials || {}),
      quantities: typeof data.quantities === 'string' ? JSON.parse(data.quantities) : (data.quantities || {}),
      labor_rates: typeof data.labor_rates === 'string' ? JSON.parse(data.labor_rates) : (data.labor_rates || {}),
      measurements: typeof data.measurements === 'string' ? JSON.parse(data.measurements) : (data.measurements || {})
    } as Estimate;

    return { data: parsedData, error: null };

  } catch (e: any) {
    console.error("Error in saveEstimate function:", e);
    return { data: null, error: e instanceof Error ? e : new Error("Unknown error in saveEstimate") };
  }
};

/**
 * Get all estimates with optional filtering by status
 */
export const getEstimates = async (status?: EstimateStatus): Promise<{
  data: Estimate[];
  error: Error | null;
}> => {
  try {
    if (!isSupabaseConfigured()) {
      return { data: [], error: new Error("Supabase not configured") };
    }
    let query = supabase.from("estimates").select("*");
    if (status) {
      query = query.eq("status", status);
    }
    query = query.order("created_at", { ascending: false });
    const { data, error } = await query;
    if (error) throw error;

    const parsedData = (data || []).map(estimate => ({
      ...estimate,
      status: estimate.status as EstimateStatus,
      materials: typeof estimate.materials === 'string' ? JSON.parse(estimate.materials) : (estimate.materials || {}),
      quantities: typeof estimate.quantities === 'string' ? JSON.parse(estimate.quantities) : (estimate.quantities || {}),
      labor_rates: typeof estimate.labor_rates === 'string' ? JSON.parse(estimate.labor_rates) : (estimate.labor_rates || {}),
      measurements: typeof estimate.measurements === 'string' ? JSON.parse(estimate.measurements) : (estimate.measurements || {})
    }));
    return { data: parsedData as Estimate[], error: null };
  } catch (error) {
    console.error("Error fetching estimates:", error);
    return { data: [], error: error instanceof Error ? error : new Error("Unknown error occurred") };
  }
};

/**
 * Get a single estimate by ID
 */
export const getEstimateById = async (id: string): Promise<{
  data: Estimate | null;
  error: Error | null;
}> => {
  try {
    if (!isSupabaseConfigured()) {
      return { data: null, error: new Error("Supabase not configured") };
    }
    const { data, error } = await supabase.from("estimates").select("*").eq("id", id).single();
    if (error) {
      // If error is due to "PGRST116" (resource not found), return null data
      if (error.code === 'PGRST116') return { data: null, error: null };
      throw error;
    }
    if (!data) return { data: null, error: null };

    const parsedData = {
      ...data,
      status: data.status as EstimateStatus,
      materials: typeof data.materials === 'string' ? JSON.parse(data.materials) : (data.materials || {}),
      quantities: typeof data.quantities === 'string' ? JSON.parse(data.quantities) : (data.quantities || {}),
      labor_rates: typeof data.labor_rates === 'string' ? JSON.parse(data.labor_rates) : (data.labor_rates || {}),
      measurements: typeof data.measurements === 'string' ? JSON.parse(data.measurements) : (data.measurements || {})
    };
    return { data: parsedData as Estimate, error: null };
  } catch (error) {
    console.error("Error fetching estimate by ID:", error);
    return { data: null, error: error instanceof Error ? error : new Error("Unknown error occurred") };
  }
};

/**
 * Update an estimate's status
 */
export const updateEstimateStatus = async (
  id: string,
  status: EstimateStatus,
  notes?: string
): Promise<{
  data: any;
  error: Error | null;
}> => {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.warn("Supabase not configured, cannot update estimate status");
      return { data: null, error: new Error("Supabase not configured") };
    }

    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };
    
    // Add notes if provided
    if (notes) {
      Object.assign(updateData, { notes });
    }

    const { data, error } = await supabase
      .from("estimates")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error("Error updating estimate status:", error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Unknown error occurred")
    };
  }
};

/**
 * Generate PDF for an approved estimate
 */
export const generateEstimatePdf = async (id: string): Promise<{
  data: { url: string } | null;
  error: Error | null;
}> => {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.warn("Supabase not configured, cannot generate PDF");
      return { data: null, error: new Error("Supabase not configured") };
    }

    // First, get the estimate
    const { data: estimate, error: fetchError } = await getEstimateById(id);
    
    if (fetchError) {
      throw fetchError;
    }
    
    // Check if estimate is approved (only approved estimates can generate PDFs)
    if (estimate?.status !== "approved") {
      throw new Error("Cannot generate PDF for estimates that are not approved");
    }
    
    // Fetch any needed auxiliary data
    
    // Create PDF content based on estimate data
    // This should be generated using a PDF library or by using your backend API
    const pdfData = {
      estimateId: estimate.id,
      customerName: estimate.customer_name || "Customer",
      customerAddress: estimate.customer_address,
      customerEmail: estimate.customer_email,
      customerPhone: estimate.customer_phone,
      totalPrice: estimate.total_price,
      measurements: estimate.measurements,
      materials: estimate.materials,
      quantities: estimate.quantities,
      laborRates: estimate.labor_rates,
      profitMargin: estimate.profit_margin,
      createdAt: estimate.created_at,
      notes: estimate.notes
    };
    
    // Call PDF generation service
    // In a real implementation, this would call an API endpoint that returns a PDF URL
    // For this implementation, we'll return a mock URL for demonstration purposes
    
    // Here you would integrate with your actual PDF generation service
    // For example:
    // const pdfResponse = await fetch('/api/generate-pdf', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(pdfData)
    // });
    // const pdfResult = await pdfResponse.json();
    // return { data: { url: pdfResult.url }, error: null };
    
    // Mock implementation - in production this would be an actual PDF generation call
    console.log("Generating PDF for estimate:", id, pdfData);
    
    // Generate a mock PDF URL
    const mockPdfUrl = `/estimates/${id}/3mg-estimate-${id}.pdf`;
    
    // Update the estimate to record that a PDF was generated
    await supabase
      .from("estimates")
      .update({
        pdf_generated: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);
    
    return { 
      data: { url: mockPdfUrl }, 
      error: null 
    };
  } catch (error) {
    console.error("Error generating PDF:", error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Unknown error generating PDF")
    };
  }
};

/**
 * Calculate estimate total
 * This is a helper function to calculate the total price of an estimate
 * based on materials, labor rates, and profit margin
 */
export const calculateEstimateTotal = (
  materials: Record<string, Material>,
  quantities: Record<string, number>,
  laborRatesInput: LaborRates, // Renamed to avoid conflict with internal laborRates variable
  profitMargin: number,
  measurementsInput?: MeasurementValues, // Make measurements an optional parameter for broader use, but required for pitch calc
  peelStickCost: number = 0 // Added peelStickCost as it's part of the total
): number => {
  // Ensure we have a safe laborRates object with defaults
  const defaultLaborRates: LaborRates = {
    laborRate: 85, tearOff: 0, installation: 0, isHandload: false, handloadRate: 10,
    dumpsterLocation: "orlando", dumpsterCount: 1, dumpsterRate: 400, includePermits: true,
    permitRate: 450, permitCount: 1, permitAdditionalRate: 450, pitchRates: {},
    wastePercentage: 12, includeGutters: false, gutterLinearFeet: 0, gutterRate: 8,
    includeDownspouts: false, downspoutCount: 0, downspoutRate: 75,
    includeDetachResetGutters: false, detachResetGutterLinearFeet: 0, detachResetGutterRate: 1,
  };
  const laborRates: LaborRates = { ...defaultLaborRates, ...(laborRatesInput || {}) };

  // Calculate materials cost
  let materialCost = 0;
  for (const materialId in materials) {
    const material = materials[materialId];
    const quantity = quantities[materialId] || 0;
    if (material && typeof material.price === 'number' && !isNaN(material.price) && typeof quantity === 'number' && !isNaN(quantity)) {
        materialCost += material.price * quantity;
    }
  }
  materialCost += peelStickCost; // Add peel and stick cost to material cost

  // --- Detailed Labor Cost Calculation (adapted from calculateFinalCosts/EstimateSummaryTab) ---
  let calculated_labor_cost = 0;
  const measurements = measurementsInput || { totalArea: 0, areasByPitch: [], predominantPitch: "6/12" }; // Basic default if not provided
  const totalArea = measurements.totalArea || 0;
  const totalSquares = totalArea > 0 ? totalArea / 100 : 0;
  const wasteFactorPercentage = laborRates.wastePercentage || 12; // Default 12%
  const wasteMultiplier = 1 + (wasteFactorPercentage / 100);

  // Helper to get pitch rate, considering custom rates from laborRates.pitchRates
  const getPitchRate = (pitchKey: string): number => {
      const pitchValue = parseInt(pitchKey.split(/[:\/]/)[0]) || 0;
      
      // Check for custom rate first
      if (laborRates.pitchRates && laborRates.pitchRates[pitchKey] !== undefined) {
          return laborRates.pitchRates[pitchKey];
      }

      // Default logic if no custom rate (consistent with LaborProfitTab's getPitchRate)
      if (pitchValue >= 8) { // Steep
          const basePitchValue = 8; const baseRate = 90; const increment = 5;
          return baseRate + (pitchValue - basePitchValue) * increment;
      }
      if (pitchValue === 0) return 50; // Flat
      if (pitchValue <= 2) return 109; // Low Slope (1-2/12)
      return laborRates.laborRate || 85; // Standard (3-7/12) or overall default
  };

  if (measurements.areasByPitch && measurements.areasByPitch.length > 0 && totalSquares > 0) {
      measurements.areasByPitch.forEach(area => {
          const pitchKey = area.pitch.replace("/", ":"); // Normalize to X:12 format
          const areaSquares = (area.area || 0) / 100;
          if (areaSquares > 0) {
              const rate = getPitchRate(pitchKey);
              calculated_labor_cost += rate * areaSquares * wasteMultiplier;
          }
      });
  } else if (totalSquares > 0) {
      const fallbackRate = laborRates.laborRate || 85;
      calculated_labor_cost += fallbackRate * totalSquares * wasteMultiplier;
  }

  if (laborRates.isHandload && totalSquares > 0) {
      calculated_labor_cost += (laborRates.handloadRate || 15) * totalSquares * wasteMultiplier;
  }
  if (laborRates.dumpsterCount && laborRates.dumpsterRate) {
      calculated_labor_cost += laborRates.dumpsterCount * laborRates.dumpsterRate;
  }
  if (laborRates.includePermits) {
      const permitCount = laborRates.permitCount || 1;
      const basePermitRate = laborRates.permitRate || (laborRates.dumpsterLocation === "orlando" ? 450 : 550);
      const additionalPermitRate = laborRates.permitAdditionalRate || basePermitRate;
      calculated_labor_cost += basePermitRate + Math.max(0, permitCount - 1) * additionalPermitRate;
  }
  // Add other fixed costs like gutters, downspouts if they are part of laborRates and applicable
  if (laborRates.includeGutters && laborRates.gutterLinearFeet && laborRates.gutterRate) {
    calculated_labor_cost += laborRates.gutterLinearFeet * laborRates.gutterRate;
  }
  if (laborRates.includeDownspouts && laborRates.downspoutCount && laborRates.downspoutRate) {
    calculated_labor_cost += laborRates.downspoutCount * laborRates.downspoutRate;
  }
  if (laborRates.includeDetachResetGutters && laborRates.detachResetGutterLinearFeet && laborRates.detachResetGutterRate) {
    calculated_labor_cost += laborRates.detachResetGutterLinearFeet * laborRates.detachResetGutterRate;
  }
  // --- End of Detailed Labor Cost Calculation ---

  const subtotal = materialCost + calculated_labor_cost;
  const profitAmount = subtotal * (profitMargin / 100);
  const total = subtotal + profitAmount;

  console.log("API calculateEstimateTotal V2:", {
    materialCost,
    peelStickCost,
    calculated_labor_cost,
    subtotal,
    profitMargin,
    profitAmount,
    total,
    wasteFactorUsedForLabor: wasteMultiplier
  });

  // Consider if rounding to 2 decimal places is better than nearest dollar for final total
  return parseFloat(total.toFixed(2)); 
};

// --- Helper Function for Cost Calculation ---
// NOTE: This logic MUST precisely match the calculations used in EstimateSummaryTab.tsx
//       Consider refactoring the logic from EstimateSummaryTab into a shared utility
//       function to avoid duplication and ensure consistency.
const calculateFinalCosts = (estimateData: Estimate) => {
  console.log("[calculateFinalCosts] Received estimateData:", JSON.stringify(estimateData, null, 2));

  const defaultLaborRatesFull: LaborRates = {
    laborRate: 85, tearOff: 0, installation: 0, isHandload: false, handloadRate: 10,
    dumpsterLocation: "orlando", dumpsterCount: 1, dumpsterRate: 400, includePermits: true,
    permitRate: 450, permitCount: 1, permitAdditionalRate: 450, pitchRates: {},
    wastePercentage: 12, includeGutters: false, gutterLinearFeet: 0, gutterRate: 8,
    includeDownspouts: false, downspoutCount: 0, downspoutRate: 75,
    includeDetachResetGutters: false, detachResetGutterLinearFeet: 0, detachResetGutterRate: 1,
  };

  const safeMeasurements = estimateData.measurements as MeasurementValues || { totalArea: 0, areasByPitch: [] };
  const selectedMaterials = estimateData.materials as Record<string, Material> || {};
  const quantities = estimateData.quantities as Record<string, number> || {};
  const laborRates = { ...defaultLaborRatesFull, ...(estimateData.labor_rates as LaborRates || {}) }; 
  const profitMargin = estimateData.profit_margin || 0;
  const peelStickAddonCost = estimateData.peel_stick_addon_cost || 0; 

  console.log("[calculateFinalCosts] Parsed Materials:", selectedMaterials);
  console.log("[calculateFinalCosts] Parsed Quantities:", quantities);
  console.log("[calculateFinalCosts] Parsed LaborRates:", laborRates);
  console.log("[calculateFinalCosts] Parsed Measurements:", safeMeasurements);

  // --- Material Cost Calculation ---
  let calculated_material_cost = 0;
  try {
    for (const materialId in selectedMaterials) {
      const material = selectedMaterials[materialId];
      const quantity = quantities[materialId] || 0;
      console.log(`[calculateFinalCosts] Processing Material: ID=${materialId}, Qty=${quantity}, Material Data:`, material);
      
      // **Crucial Check:** Ensure material and price exist and are valid numbers
      if (material && typeof material.price === 'number' && !isNaN(material.price) && typeof quantity === 'number' && !isNaN(quantity)) {
        calculated_material_cost += material.price * quantity;
      } else {
        console.warn(`[calculateFinalCosts] Skipping invalid material/quantity: ID=${materialId}, Price=${material?.price}, Qty=${quantity}`);
      }
    }
  } catch (matError) {
    console.error("[calculateFinalCosts] Error during material cost calculation:", matError);
    throw new Error("Material cost calculation failed."); // Re-throw or handle
  }
  calculated_material_cost += peelStickAddonCost; 

  // --- Labor Cost Calculation --- 
  let calculated_labor_cost = 0;
  const totalArea = safeMeasurements.totalArea || 0;
  const totalSquares = totalArea > 0 ? totalArea / 100 : 0;
  const wasteFactor = (laborRates.wastePercentage || 12) / 100; // Default 12%

  // Helper to get pitch rate (adjust based on your actual implementation)
  const getPitchRate = (pitch: string): number => {
      const pitchKey = pitch.replace("/", ":");
      if (laborRates.pitchRates && laborRates.pitchRates[pitchKey] !== undefined) {
        return laborRates.pitchRates[pitchKey];
      }
      const pitchValue = parseInt(pitchKey.split(/[:\/]/)[0]) || 0;
      const hasPolyIso = Object.values(selectedMaterials).some(m => m.id === "gaf-poly-iso-4x8");
      const hasPolyglass = Object.values(selectedMaterials).some(m => m.id === "polyglass-elastoflex-sbs" || m.id === "polyglass-polyflex-app");
      if (pitchValue === 0 && hasPolyIso) return 60;
      if ((pitchValue === 1 || pitchValue === 2) && hasPolyglass) return 109;
      if (pitchValue <= 2) return 75; 
      if (pitchValue >= 8) { 
          const basePitchValue = 8;
          const baseRate = 90;
          const increment = 5;
          return baseRate + (pitchValue - basePitchValue) * increment;
      }
      return laborRates.laborRate || 85; 
  };

  // Calculate pitch-based labor
  if (safeMeasurements.areasByPitch && safeMeasurements.areasByPitch.length > 0 && totalSquares > 0) {
      safeMeasurements.areasByPitch.forEach(area => {
          const pitch = area.pitch;
          const areaSquares = (area.area || 0) / 100;
          if (areaSquares > 0) {
              const rate = getPitchRate(pitch);
              calculated_labor_cost += rate * areaSquares * (1 + wasteFactor);
              console.log(`[calculateFinalCosts] Labor for Pitch ${pitch}: ${areaSquares.toFixed(2)} sq @ $${rate}/sq (w/ waste) = $${(rate * areaSquares * (1 + wasteFactor)).toFixed(2)}`);
          }
      });
  } else if (totalSquares > 0) {
      // Fallback if no pitch data but total area exists
      const fallbackRate = laborRates.laborRate || 85;
      calculated_labor_cost += fallbackRate * totalSquares * (1 + wasteFactor);
      console.log(`[calculateFinalCosts] Labor Fallback: ${totalSquares.toFixed(2)} sq @ $${fallbackRate}/sq (w/ waste) = $${(fallbackRate * totalSquares * (1 + wasteFactor)).toFixed(2)}`);
  }

  // Add Handload
  if (laborRates.isHandload && totalSquares > 0) {
      const handloadCost = (laborRates.handloadRate || 15) * totalSquares * (1 + wasteFactor); // Default 15/sq
      calculated_labor_cost += handloadCost;
      console.log(`[calculateFinalCosts] Added Handload: $${handloadCost.toFixed(2)}`);
  }

  // Add Dumpsters
  // Use stored count/rate if available, otherwise calculate
  const dumpsterCount = laborRates.dumpsterCount || (totalSquares > 0 ? Math.max(1, Math.ceil(totalSquares / 20)) : 0); 
  if (dumpsterCount > 0) {
      const dumpsterRate = laborRates.dumpsterRate || (laborRates.dumpsterLocation === "orlando" ? 400 : 500); // Defaults
      const dumpsterTotalCost = dumpsterCount * dumpsterRate;
      calculated_labor_cost += dumpsterTotalCost;
      console.log(`[calculateFinalCosts] Added Dumpsters (${dumpsterCount}): $${dumpsterTotalCost.toFixed(2)}`);
  }

  // Add Permits
  if (laborRates.includePermits) {
      const permitCount = laborRates.permitCount || 1;
      const basePermitRate = laborRates.permitRate || (laborRates.dumpsterLocation === "orlando" ? 450 : 550); // Defaults
      const additionalPermitRate = laborRates.permitAdditionalRate || basePermitRate; // Default additional to base rate
      const permitTotalCost = basePermitRate + Math.max(0, permitCount - 1) * additionalPermitRate;
      calculated_labor_cost += permitTotalCost;
      console.log(`[calculateFinalCosts] Added Permits (${permitCount}): $${permitTotalCost.toFixed(2)}`);
  }

  // Add Gutters
  if (laborRates.includeGutters && laborRates.gutterLinearFeet && laborRates.gutterLinearFeet > 0) {
      const gutterCost = (laborRates.gutterRate || 8) * laborRates.gutterLinearFeet; // Default $8/ft
      calculated_labor_cost += gutterCost;
      console.log(`[calculateFinalCosts] Added Gutters (${laborRates.gutterLinearFeet} ft): $${gutterCost.toFixed(2)}`);
  }

  // Add Downspouts
  if (laborRates.includeDownspouts && laborRates.downspoutCount && laborRates.downspoutCount > 0) {
      const downspoutCost = (laborRates.downspoutRate || 75) * laborRates.downspoutCount; // Default $75 each
      calculated_labor_cost += downspoutCost;
      console.log(`[calculateFinalCosts] Added Downspouts (${laborRates.downspoutCount}): $${downspoutCost.toFixed(2)}`);
  }

  // Add Detach/Reset Gutters 
  if (laborRates.includeDetachResetGutters && laborRates.detachResetGutterLinearFeet && laborRates.detachResetGutterLinearFeet > 0) {
      const detachCost = (laborRates.detachResetGutterRate || 1) * laborRates.detachResetGutterLinearFeet; // Default $1/ft
      calculated_labor_cost += detachCost;
      console.log(`[calculateFinalCosts] Added Detach/Reset Gutters (${laborRates.detachResetGutterLinearFeet} ft): $${detachCost.toFixed(2)}`);
  }

  // --- Subtotal and Profit --- 
  const calculated_subtotal = calculated_material_cost + calculated_labor_cost;
  const calculated_profit_amount = calculated_subtotal * (profitMargin / 100);
  const calculated_total = calculated_subtotal + calculated_profit_amount;

  console.log("[calculateFinalCosts] Calculated values:", { calculated_material_cost, calculated_labor_cost, calculated_subtotal, calculated_profit_amount });

  return {
    calculated_material_cost,
    calculated_labor_cost,
    calculated_subtotal,
    calculated_profit_amount,
    calculated_total 
  };
};

// --- Modified Function: markEstimateAsSold --- 
export const markEstimateAsSold = async (
  estimateId: string, 
  jobType: 'Retail' | 'Insurance', 
  insuranceCompany?: string 
): Promise<Estimate> => {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  if (!estimateId) {
    throw new Error("Estimate ID is required.");
  }
  if (!jobType) {
      throw new Error("Job Type (Retail/Insurance) is required.");
  }
  if (jobType === 'Insurance' && !insuranceCompany) {
      throw new Error("Insurance Company name is required when Job Type is Insurance.");
  }

  const { data: rawEstimateData, error: fetchError } = await supabase
    .from('estimates')
    .select('*') 
    .eq('id', estimateId)
    .single();

  if (fetchError || !rawEstimateData) {
    console.error("Error fetching estimate for 'Mark as Sold':", fetchError);
    throw new Error(`Estimate not found or error fetching: ${fetchError?.message || 'Unknown error'}`);
  }

  let parsedEstimateData: Estimate;
  try {
      parsedEstimateData = {
        ...rawEstimateData,
        status: rawEstimateData.status as EstimateStatus,
        materials: typeof rawEstimateData.materials === 'string' ? JSON.parse(rawEstimateData.materials) : (rawEstimateData.materials || {}),
        quantities: typeof rawEstimateData.quantities === 'string' ? JSON.parse(rawEstimateData.quantities) : (rawEstimateData.quantities || {}),
        labor_rates: typeof rawEstimateData.labor_rates === 'string' ? JSON.parse(rawEstimateData.labor_rates) : (rawEstimateData.labor_rates || {}),
        measurements: typeof rawEstimateData.measurements === 'string' ? JSON.parse(rawEstimateData.measurements) : (rawEstimateData.measurements || { areasByPitch: [] }),
      } as Estimate;
  } catch (parseError: any) {
      console.error("[markEstimateAsSold] Error parsing estimate JSON fields:", parseError);
      throw new Error(`Failed to parse estimate data: ${parseError.message}`);
  }
  
  const finalCosts = calculateFinalCosts(parsedEstimateData); 

  const updatePayload = {
      is_sold: true,
      sold_at: new Date().toISOString(),
      status: 'Sold' as EstimateStatus, 
      job_type: jobType,
      insurance_company: jobType === 'Insurance' ? insuranceCompany : null, 
      calculated_material_cost: finalCosts.calculated_material_cost,
      calculated_labor_cost: finalCosts.calculated_labor_cost,
      calculated_subtotal: finalCosts.calculated_subtotal,
      calculated_profit_amount: finalCosts.calculated_profit_amount,
      total_price: finalCosts.calculated_total, 
      updated_at: new Date().toISOString(),
  };

  const { data: updatedEstimate, error: updateError } = await supabase
    .from('estimates')
    .update(updatePayload as any) // Using 'as any' for the payload
    .eq('id', estimateId)
    .select() 
    .single(); 

  if (updateError) {
    console.error("Error updating estimate to 'Sold':", updateError);
    throw new Error(`Failed to mark estimate as sold: ${updateError.message}`);
  }

  if (!updatedEstimate) {
     throw new Error("Failed to update estimate and retrieve the updated record.");
  }
  
  return {
      ...updatedEstimate,
      status: updatedEstimate.status as EstimateStatus,
      materials: typeof updatedEstimate.materials === 'string' ? JSON.parse(updatedEstimate.materials) : (updatedEstimate.materials || {}),
      quantities: typeof updatedEstimate.quantities === 'string' ? JSON.parse(updatedEstimate.quantities) : (updatedEstimate.quantities || {}),
      labor_rates: typeof updatedEstimate.labor_rates === 'string' ? JSON.parse(updatedEstimate.labor_rates) : (updatedEstimate.labor_rates || {}),
      measurements: typeof updatedEstimate.measurements === 'string' ? JSON.parse(updatedEstimate.measurements) : (updatedEstimate.measurements || { areasByPitch: [] }),
  } as Estimate; 
};

// Define the structure expected by the Accounting Report page
interface SoldEstimateReportData {
  id: string;
  customer_name?: string;
  customer_address?: string; // Use one field for the full address
  // Remove individual address fields if they don't exist in the table
  // address_street?: string;
  // address_city?: string;
  // address_state?: string;
  // address_zip?: string;
  sold_at: string | null;
  calculated_material_cost: number | null;
  calculated_labor_cost: number | null;
  calculated_subtotal: number | null;
  profit_margin: number | null;
  calculated_profit_amount: number | null;
  total_price: number | null;
}

export const getSoldEstimates = async (filters?: { startDate?: string, endDate?: string }): Promise<SoldEstimateReportData[]> => {
  if (!isSupabaseConfigured) {
    console.error("[getSoldEstimates] Supabase is not configured.");
    throw new Error("Supabase is not configured.");
  }

  let query = supabase
    .from('estimates')
    .select(`
      id,
      customer_name,
      customer_address,
      sold_at,
      calculated_material_cost,
      calculated_labor_cost,
      calculated_subtotal,
      profit_margin, 
      calculated_profit_amount,
      total_price
    `) 
    .eq('is_sold', true);

  // Apply date filters
  if (filters?.startDate) {
    query = query.gte('sold_at', filters.startDate);
  }
  if (filters?.startDate && filters.endDate) {
    query = query.lte('sold_at', filters.endDate);
  }

  // Order by sold date descending
  query = query.order('sold_at', { ascending: false });

  // Execute the query
  const { data, error } = await query;

  // Handle potential errors
  if (error) {
    console.error("[getSoldEstimates] Error fetching sold estimates:", error);
    throw new Error(`Failed to fetch sold estimates: ${error.message}`);
  }

  // Log success and return the data (or an empty array)
  console.log("[getSoldEstimates] Successfully fetched data:", data);
  return (data || []) as SoldEstimateReportData[]; 
};

/**
 * Update customer details for a specific estimate
 */
export const updateEstimateCustomerDetails = async (
  id: string,
  details: {
    customer_name?: string | null;
    customer_email?: string | null;
    customer_phone?: string | null;
  }
): Promise<{ data: Estimate | null; error: Error | null }> => {
  if (!isSupabaseConfigured) {
    console.error("[updateEstimateCustomerDetails] Supabase not configured.");
    throw new Error("Supabase not configured.");
  }
  if (!id) {
    throw new Error("Estimate ID is required.");
  }

  // Prepare only non-empty fields for update
  const updateData: Partial<Estimate> = {};
  if (details.customer_name !== undefined) updateData.customer_name = details.customer_name;
  if (details.customer_email !== undefined) updateData.customer_email = details.customer_email;
  if (details.customer_phone !== undefined) updateData.customer_phone = details.customer_phone;
  updateData.updated_at = new Date().toISOString();

  if (Object.keys(updateData).length <= 1) { // Only updated_at
      console.warn("[updateEstimateCustomerDetails] No details provided to update.");
      // Optionally fetch and return the current estimate data if needed
      return getEstimateById(id); 
  }

  console.log(`[updateEstimateCustomerDetails] Updating estimate ${id} with:`, updateData);

  const { data, error } = await supabase
    .from("estimates")
    .update(updateData as any) // Use 'as any' for updateData
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[updateEstimateCustomerDetails] Error updating details:", error);
    throw new Error(`Failed to update customer details: ${error.message}`);
  }

  console.log("[updateEstimateCustomerDetails] Update successful:", data);
  // Ensure returned data is parsed correctly if needed elsewhere
  const parsedData = data ? {
      ...data,
      status: data.status as EstimateStatus,
      materials: typeof data.materials === 'string' ? JSON.parse(data.materials) : (data.materials || {}),
      quantities: typeof data.quantities === 'string' ? JSON.parse(data.quantities) : (data.quantities || {}),
      labor_rates: typeof data.labor_rates === 'string' ? JSON.parse(data.labor_rates) : (data.labor_rates || {}),
      measurements: typeof data.measurements === 'string' ? JSON.parse(data.measurements) : (data.measurements || { areasByPitch: [] })
  } : null;

  return { data: parsedData as Estimate | null, error: null };
};

// --- Ensure deleteEstimate is exported if used --- 
// Example: If you have a deleteEstimate function, make sure it's exported:
// export const deleteEstimate = async (id: string): Promise<...> => { ... };
