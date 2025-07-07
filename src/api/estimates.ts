import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { MeasurementValues } from "@/components/estimates/measurement/types";
import { Material } from "@/components/estimates/materials/types";
import { LaborRates } from "@/components/estimates/pricing/LaborProfitTab";
import { trackEstimateCreated, trackEvent, trackPerformanceMetric } from "@/lib/posthog";
import { trackEstimateCreated as trackEstimateCreatedLR, trackEstimateSold } from "@/lib/logrocket";

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
  rejection_reason?: string; // Reason for rejection if status is 'rejected'
  // Creator information for dashboard display
  creator_name?: string;
  creator_role?: 'admin' | 'manager' | 'rep' | 'subtrade_manager';
  created_by?: string; // User ID who created the estimate
}

/**
 * Save a new estimate to the database with "pending" status
 */
export const saveEstimate = async (
  estimateInput: Partial<Estimate> & { id?: string } 
): Promise<{ data: Estimate | null; error: Error | null; }> => {
  const startTime = performance.now();
  try {
    if (!isSupabaseConfigured()) {
      console.warn("Supabase not configured, estimate will not be saved to database");
      return { data: null, error: new Error("Supabase not configured") };
    }

    const now = new Date().toISOString();

    const { 
      created_at, 
      updated_at,
      id: inputId,
      materials: inputMaterials,
      quantities: inputQuantities,
      labor_rates: inputLaborRates,
      measurements: inputMeasurements,
      status: inputStatus,
      ...restOfEstimateInput 
    } = estimateInput;

    const payload: any = {
      ...restOfEstimateInput,
      materials: inputMaterials || {},
      quantities: inputQuantities || {},
      labor_rates: inputLaborRates || {},
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
      const { created_at: _createdAt, id: _id, ...updatePayload } = payload; 
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

    const parsedData = {
      ...data,
      status: data.status as EstimateStatus,
      materials: typeof data.materials === 'string' ? JSON.parse(data.materials) : (data.materials || {}),
      quantities: typeof data.quantities === 'string' ? JSON.parse(data.quantities) : (data.quantities || {}),
      labor_rates: typeof data.labor_rates === 'string' ? JSON.parse(data.labor_rates) : (data.labor_rates || {}),
      measurements: typeof data.measurements === 'string' ? JSON.parse(data.measurements) : (data.measurements || {})
    } as Estimate;

    // Track estimate creation for analytics (only for new estimates, not updates)
    if (!inputId) {
      try {
        // PostHog tracking
        trackEstimateCreated({
          estimateValue: parsedData.total_price,
          userRole: 'unknown' // Will be updated when we have user context
        });
        
        // LogRocket tracking
        trackEstimateCreatedLR({
          estimateId: parsedData.id,
          customerAddress: parsedData.customer_address,
          totalPrice: parsedData.total_price,
          userRole: 'unknown'
        });
      } catch (trackingError) {
        // Don't fail the estimate save if tracking fails
        console.warn('Failed to track estimate creation:', trackingError);
      }
    }

    // Track API performance
    const apiResponseTime = performance.now() - startTime;
    trackPerformanceMetric('api_response_time', apiResponseTime, {
      operation: estimateInput.id ? 'update_estimate' : 'create_estimate',
      success: true,
      estimate_id: parsedData.id
    });

    return { data: parsedData, error: null };

  } catch (e: any) {
    // Track failed API performance
    const apiResponseTime = performance.now() - startTime;
    trackPerformanceMetric('api_response_time', apiResponseTime, {
      operation: estimateInput.id ? 'update_estimate' : 'create_estimate',
      success: false,
      error: e.message
    });
    console.error("Error in saveEstimate function:", e);
    return { data: null, error: e instanceof Error ? e : new Error("Unknown error in saveEstimate") };
  }
};

/**
 * Get all estimates with optional filtering by status (excludes soft-deleted estimates)
 */
export const getEstimates = async (status?: EstimateStatus): Promise<{
  data: Estimate[];
  error: Error | null;
}> => {
  try {
    if (!isSupabaseConfigured()) {
      return { data: [], error: new Error("Supabase not configured") };
    }
    let query = supabase.from("estimates").select("*")
      .is("deleted_at", null); // Exclude soft-deleted estimates
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
 * Get a single estimate by ID (excludes soft-deleted estimates)
 */
export const getEstimateById = async (id: string): Promise<{
  data: Estimate | null;
  error: Error | null;
}> => {
  try {
    if (!isSupabaseConfigured()) {
      return { data: null, error: new Error("Supabase not configured") };
    }
    const { data, error } = await supabase.from("estimates").select("*")
      .eq("id", id)
      .is("deleted_at", null) // Exclude soft-deleted estimates
      .single();
    if (error) {
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
    if (!isSupabaseConfigured()) {
      return { data: null, error: new Error("Supabase not configured") };
    }

    console.log(`🔧 [API] updateEstimateStatus called - ID: ${id}, Status: ${status}, Notes: ${notes ? 'provided' : 'none'}`);

    const updateData: { status: EstimateStatus, updated_at: string, notes?: string, rejection_reason?: string } = {
      status,
      updated_at: new Date().toISOString()
    };
    
    if (notes) {
      if (status === 'rejected') {
        // For rejections, save to rejection_reason field
        updateData.rejection_reason = notes;
        console.log(`🔧 [API] Setting rejection_reason: ${notes}`);
      } else {
        // For approvals and other statuses, save to notes field
        updateData.notes = notes;
        console.log(`🔧 [API] Setting notes: ${notes}`);
      }
    }

    console.log(`🔧 [API] Update payload:`, updateData);

    const { data, error } = await supabase
      .from("estimates")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(`🚨 [API] Supabase error:`, error);
      throw error;
    }

    console.log(`✅ [API] Status update successful, returned data:`, data);
    return { data, error: null };
  } catch (error) {
    console.error("🚨 [API] Error updating estimate status:", error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Unknown error occurred")
    };
  }
};

/**
 * Calculate estimate total
 */
export const calculateEstimateTotal = (
  materials: Record<string, Material>,
  quantities: Record<string, number>,
  laborRatesInput: LaborRates,
  profitMargin: number,
  measurementsInput?: MeasurementValues,
  peelStickCost: number = 0
): number => {
  const defaultLaborRates: LaborRates = {
    laborRate: 85, tearOff: 0, installation: 0, isHandload: false, handloadRate: 10,
    dumpsterLocation: "orlando", dumpsterCount: 1, dumpsterRate: 400, includePermits: true,
    permitRate: 450, permitCount: 1, permitAdditionalRate: 450, pitchRates: {},
    wastePercentage: 12, includeGutters: false, gutterLinearFeet: 0, gutterRate: 8,
    includeDownspouts: false, downspoutCount: 0, downspoutRate: 75,
    includeDetachResetGutters: false, detachResetGutterLinearFeet: 0, detachResetGutterRate: 1,
    includeSkylights2x2: false, skylights2x2Count: 0, skylights2x2Rate: 280,
    includeSkylights2x4: false, skylights2x4Count: 0, skylights2x4Rate: 370,
  };
  const laborRates: LaborRates = { ...defaultLaborRates, ...(laborRatesInput || {}) };

  let materialCost = 0;
  for (const materialId in materials) {
    const material = materials[materialId];
    const quantity = quantities[materialId] || 0;
    if (material && typeof material.price === 'number' && !isNaN(material.price) && typeof quantity === 'number' && !isNaN(quantity)) {
        materialCost += material.price * quantity;
    }
  }
  materialCost += peelStickCost;

  let calculated_labor_cost = 0;
  const measurements = measurementsInput || { totalArea: 0, areasByPitch: [], predominantPitch: "6/12" };
  const totalArea = measurements.totalArea || 0;
  const totalSquares = totalArea > 0 ? totalArea / 100 : 0;
  const wasteFactorPercentage = laborRates.wastePercentage || 12;
  const wasteMultiplier = 1 + (wasteFactorPercentage / 100);

  const getPitchRate = (pitchKeyInput: string): number => {
      const pitchKey = pitchKeyInput.replace("/", ":");
      if (laborRates.pitchRates && laborRates.pitchRates[pitchKey] !== undefined) {
          return laborRates.pitchRates[pitchKey];
      }
      const pitchValue = parseInt(pitchKey.split(/[:\/]/)[0]) || 0;
      if (pitchValue === 0) {
          const override = laborRates.pitchRates && laborRates.pitchRates["0:12"];
          return override !== undefined ? override : 159;
      }
      if (pitchValue >= 8) { 
          const basePitchValue = 8; const baseRate = 90; const increment = 5;
          return baseRate + (pitchValue - basePitchValue) * increment;
      }
      if (pitchValue <= 2) return 109; 
      return laborRates.laborRate || 85; 
  };

  if (measurements.areasByPitch && measurements.areasByPitch.length > 0 && totalSquares > 0) {
      measurements.areasByPitch.forEach(area => {
          const areaSquares = Math.ceil((area.area || 0) / 100);

          if (areaSquares > 0) {
              const rate = getPitchRate(area.pitch);
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
  if (laborRates.includeGutters && laborRates.gutterLinearFeet && laborRates.gutterRate) {
    calculated_labor_cost += laborRates.gutterLinearFeet * laborRates.gutterRate;
  }
  if (laborRates.includeDownspouts && laborRates.downspoutCount && laborRates.downspoutRate) {
    calculated_labor_cost += laborRates.downspoutCount * laborRates.downspoutRate;
  }
  if (laborRates.includeDetachResetGutters && laborRates.detachResetGutterLinearFeet && laborRates.detachResetGutterRate) {
    calculated_labor_cost += laborRates.detachResetGutterLinearFeet * laborRates.detachResetGutterRate;
  }
  if (laborRates.includeSkylights2x2 && laborRates.skylights2x2Count && laborRates.skylights2x2Rate) {
    calculated_labor_cost += laborRates.skylights2x2Count * laborRates.skylights2x2Rate;
  }
  if (laborRates.includeSkylights2x4 && laborRates.skylights2x4Count && laborRates.skylights2x4Rate) {
    calculated_labor_cost += laborRates.skylights2x4Count * laborRates.skylights2x4Rate;
  }

  const subtotal = materialCost + calculated_labor_cost;
  const margin = profitMargin / 100;
  const totalPrice = margin < 1 ? subtotal / (1 - margin) : subtotal;
  return totalPrice;
};

const calculateFinalCosts = (estimateData: Estimate) => {
  const defaultLaborRatesFull: LaborRates = {
    laborRate: 85, tearOff: 0, installation: 0, isHandload: false, handloadRate: 10,
    dumpsterLocation: "orlando", dumpsterCount: 1, dumpsterRate: 400, includePermits: true,
    permitRate: 450, permitCount: 1, permitAdditionalRate: 450, pitchRates: {},
    wastePercentage: 12, includeGutters: false, gutterLinearFeet: 0, gutterRate: 8,
    includeDownspouts: false, downspoutCount: 0, downspoutRate: 75,
    includeDetachResetGutters: false, detachResetGutterLinearFeet: 0, detachResetGutterRate: 1,
    includeSkylights2x2: false, skylights2x2Count: 0, skylights2x2Rate: 280,
    includeSkylights2x4: false, skylights2x4Count: 0, skylights2x4Rate: 370,
  };

  const safeMeasurements = estimateData.measurements as MeasurementValues || { totalArea: 0, areasByPitch: [] };
  const selectedMaterials = estimateData.materials as Record<string, Material> || {};
  const quantities = estimateData.quantities as Record<string, number> || {};
  const laborRates = { ...defaultLaborRatesFull, ...(estimateData.labor_rates as LaborRates || {}) }; 
  const profitMargin = estimateData.profit_margin || 0;
  const peelStickAddonCost = estimateData.peel_stick_addon_cost || 0; 

  let calculated_material_cost = 0;
  try {
    for (const materialId in selectedMaterials) {
      const material = selectedMaterials[materialId];
      const quantity = quantities[materialId] || 0;
      if (material && typeof material.price === 'number' && !isNaN(material.price) && typeof quantity === 'number' && !isNaN(quantity)) {
        calculated_material_cost += material.price * quantity;
      }
    }
  } catch (matError) {
    console.error("[calculateFinalCosts] Error during material cost calculation:", matError);
  }
  calculated_material_cost += peelStickAddonCost; 

  let calculated_labor_cost = 0;
  const totalArea = safeMeasurements.totalArea || 0;
  const totalSquares = totalArea > 0 ? totalArea / 100 : 0;
  const wasteFactor = (laborRates.wastePercentage || 12) / 100;

  const getPitchRate = (pitch: string): number => {
      const pitchKey = pitch.replace("/", ":");
      if (laborRates.pitchRates && laborRates.pitchRates[pitchKey] !== undefined) {
        return laborRates.pitchRates[pitchKey];
      }
      const pitchValue = parseInt(pitchKey.split(/[:\/]/)[0]) || 0;

      if (pitchValue === 0) {
        const override = laborRates.pitchRates && laborRates.pitchRates["0:12"];
        return override !== undefined ? override : 159;
      }
      if (pitchValue >= 8) { 
          const basePitchValue = 8; const baseRate = 90; const increment = 5;
          return baseRate + (pitchValue - basePitchValue) * increment;
      }
      if (pitchValue <= 2) return 109; 
      return laborRates.laborRate || 85; 
  };

  if (safeMeasurements.areasByPitch && safeMeasurements.areasByPitch.length > 0 && totalSquares > 0) {
      safeMeasurements.areasByPitch.forEach(area => {
          const areaSquares = Math.ceil((area.area || 0) / 100);

          if (areaSquares > 0) {
              const rate = getPitchRate(area.pitch);
              calculated_labor_cost += rate * areaSquares * (1 + wasteFactor);
          }
      });
  } else if (totalSquares > 0) {
      if (laborRates.includeSteepSlopeLabor !== false) {
      const fallbackRate = laborRates.laborRate || 85;
      calculated_labor_cost += fallbackRate * totalSquares * (1 + wasteFactor);
      }
  }

  if (laborRates.isHandload && totalSquares > 0 && calculated_labor_cost > 0) { 
      const handloadCost = (laborRates.handloadRate || 15) * totalSquares * (1 + wasteFactor);
      calculated_labor_cost += handloadCost;
  }

  const dumpsterCount = laborRates.dumpsterCount || (totalSquares > 0 ? Math.max(1, Math.ceil(totalSquares / 20)) : 0); 
  if (dumpsterCount > 0) {
      const dumpsterRate = laborRates.dumpsterRate || (laborRates.dumpsterLocation === "orlando" ? 400 : 500);
      const dumpsterTotalCost = dumpsterCount * dumpsterRate;
      calculated_labor_cost += dumpsterTotalCost;
  }

  if (laborRates.includePermits) {
      const permitCount = laborRates.permitCount || 1;
      const basePermitRate = laborRates.permitRate || (laborRates.dumpsterLocation === "orlando" ? 450 : 550);
      const additionalPermitRate = laborRates.permitAdditionalRate || basePermitRate;
      const permitTotalCost = basePermitRate + Math.max(0, permitCount - 1) * additionalPermitRate;
      calculated_labor_cost += permitTotalCost;
  }

  if (laborRates.includeGutters && laborRates.gutterLinearFeet && laborRates.gutterLinearFeet > 0) {
      const gutterCost = (laborRates.gutterRate || 8) * laborRates.gutterLinearFeet;
      calculated_labor_cost += gutterCost;
  }

  if (laborRates.includeDownspouts && laborRates.downspoutCount && laborRates.downspoutCount > 0) {
      const downspoutCost = (laborRates.downspoutRate || 75) * laborRates.downspoutCount;
      calculated_labor_cost += downspoutCost;
  }

  if (laborRates.includeDetachResetGutters && laborRates.detachResetGutterLinearFeet && laborRates.detachResetGutterLinearFeet > 0) {
      const detachCost = (laborRates.detachResetGutterRate || 1) * laborRates.detachResetGutterLinearFeet;
      calculated_labor_cost += detachCost;
  }

  if (laborRates.includeSkylights2x2 && laborRates.skylights2x2Count && laborRates.skylights2x2Count > 0) {
      const skylights2x2Cost = (laborRates.skylights2x2Rate || 280) * laborRates.skylights2x2Count;
      calculated_labor_cost += skylights2x2Cost;
  }

  if (laborRates.includeSkylights2x4 && laborRates.skylights2x4Count && laborRates.skylights2x4Count > 0) {
      const skylights2x4Cost = (laborRates.skylights2x4Rate || 370) * laborRates.skylights2x4Count;
      calculated_labor_cost += skylights2x4Cost;
  }

  const calculated_subtotal = calculated_material_cost + calculated_labor_cost;
  const margin = profitMargin / 100;
  const calculated_total_price = margin < 1 ? calculated_subtotal / (1 - margin) : calculated_subtotal;
  const calculated_profit_amount = calculated_total_price - calculated_subtotal;

  return {
    calculated_material_cost,
    calculated_labor_cost,
    calculated_subtotal,
    calculated_profit_amount,
    calculated_total: calculated_total_price
  };
};

export const markEstimateAsSold = async (
  estimateId: string, 
  jobType: 'Retail' | 'Insurance', 
  insuranceCompany?: string 
): Promise<Estimate> => {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");
  if (!estimateId) throw new Error("Estimate ID is required.");
  if (!jobType) throw new Error("Job Type (Retail/Insurance) is required.");
  if (jobType === 'Insurance' && !insuranceCompany) throw new Error("Insurance Company name is required when Job Type is Insurance.");

  const { data: rawEstimateData, error: fetchError } = await supabase
    .from('estimates')
    .select('*') 
    .eq('id', estimateId)
    .single();

  if (fetchError || !rawEstimateData) {
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
    .update(updatePayload as any)
    .eq('id', estimateId)
    .select() 
    .single(); 

  if (updateError) {
    throw new Error(`Failed to mark estimate as sold: ${updateError.message}`);
  }
  if (!updatedEstimate) {
     throw new Error("Failed to update estimate and retrieve the updated record.");
  }
  
  const finalResult = {
      ...updatedEstimate,
      status: updatedEstimate.status as EstimateStatus,
      materials: typeof updatedEstimate.materials === 'string' ? JSON.parse(updatedEstimate.materials) : (updatedEstimate.materials || {}),
      quantities: typeof updatedEstimate.quantities === 'string' ? JSON.parse(updatedEstimate.quantities) : (updatedEstimate.quantities || {}),
      labor_rates: typeof updatedEstimate.labor_rates === 'string' ? JSON.parse(updatedEstimate.labor_rates) : (updatedEstimate.labor_rates || {}),
      measurements: typeof updatedEstimate.measurements === 'string' ? JSON.parse(updatedEstimate.measurements) : (updatedEstimate.measurements || { areasByPitch: [] }),
  } as Estimate;

  // Track estimate sold for analytics
  try {
    // PostHog tracking
    trackEvent('estimate_sold', {
      estimate_id: estimateId,
      job_type: jobType,
      insurance_company: insuranceCompany || null,
      estimate_value: finalResult.total_price,
      sold_at: new Date().toISOString()
    });
    
    // LogRocket tracking
    trackEstimateSold({
      estimateId: estimateId,
      jobType: jobType,
      totalPrice: finalResult.total_price,
      insuranceCompany: insuranceCompany
    });
  } catch (trackingError) {
    // Don't fail the sale if tracking fails
    console.warn('Failed to track estimate sale:', trackingError);
  }

  return finalResult; 
};

interface SoldEstimateReportData {
  id: string;
  customer_name?: string;
  customer_address?: string;
  sold_at: string | null;
  calculated_material_cost: number | null;
  calculated_labor_cost: number | null;
  calculated_subtotal: number | null;
  profit_margin: number | null;
  calculated_profit_amount: number | null;
  total_price: number | null;
}

export const getSoldEstimates = async (filters?: { startDate?: string, endDate?: string }): Promise<SoldEstimateReportData[]> => {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  let query = supabase
    .from('estimates')
    .select(`id, customer_name, customer_address, sold_at, calculated_material_cost, calculated_labor_cost, calculated_subtotal, profit_margin, calculated_profit_amount, total_price`) 
    .eq('is_sold', true);

  if (filters?.startDate) {
    query = query.gte('sold_at', filters.startDate);
  }
  if (filters?.startDate && filters.endDate) {
    query = query.lte('sold_at', filters.endDate);
  }

  query = query.order('sold_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch sold estimates: ${error.message}`);
  }

  return (data || []) as SoldEstimateReportData[]; 
};

/**
 * Generate PDF for an estimate (placeholder implementation)
 */
export const generateEstimatePdf = async (id: string): Promise<{
  data: { url: string } | null;
  error: Error | null;
}> => {
  try {
    // TODO: Implement actual PDF generation
    // For now, return a placeholder URL
    console.log(`Generating PDF for estimate ${id}`);
    return { 
      data: { url: `/api/estimates/${id}/pdf` }, 
      error: null 
    };
  } catch (error) {
    console.error("Error generating PDF:", error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error("Failed to generate PDF") 
    };
  }
};

export const updateEstimateCustomerDetails = async (
  id: string,
  details: {
    customer_name?: string | null;
    customer_email?: string | null;
    customer_phone?: string | null;
  }
): Promise<{ data: Estimate | null; error: Error | null }> => {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  if (!id) {
    throw new Error("Estimate ID is required.");
  }

  const updateData: Partial<Estimate> = {};
  if (details.customer_name !== undefined) updateData.customer_name = details.customer_name;
  if (details.customer_email !== undefined) updateData.customer_email = details.customer_email;
  if (details.customer_phone !== undefined) updateData.customer_phone = details.customer_phone;
  updateData.updated_at = new Date().toISOString();

  if (Object.keys(updateData).length <= 1) {
      return getEstimateById(id); 
  }

  const { data, error } = await supabase
    .from("estimates")
    .update(updateData as any)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update customer details: ${error.message}`);
  }

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

/**
 * Soft delete an estimate by ID (Admin only)
 * This marks the estimate as deleted without permanently removing it
 */
export const deleteEstimate = async (id: string, reason?: string): Promise<{
  data: boolean;
  error: Error | null;
}> => {
  try {
    console.log('🗑️ [API] Starting deleteEstimate for ID:', id);
    
    if (!isSupabaseConfigured()) {
      console.error('🚨 [API] Supabase not configured');
      return { data: false, error: new Error("Supabase not configured") };
    }

    // Get current user and their details for debugging
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('👤 [API] Current user:', user?.id || 'anonymous');
    console.log('👤 [API] User email:', user?.email || 'no email');
    console.log('👤 [API] User error:', userError);
    
    if (userError) {
      console.error('🚨 [API] Authentication error:', userError);
      return { 
        data: false, 
        error: new Error(`Authentication failed: ${userError.message}`) 
      };
    }

    if (!user) {
      console.error('🚨 [API] No authenticated user found');
      return { 
        data: false, 
        error: new Error("User not authenticated") 
      };
    }

    // Get user profile for role checking (using type assertion for profiles table)
    const { data: profile, error: profileError } = await (supabase as any)
      .from("profiles")
      .select("id, role, territory_id, full_name")
      .eq("id", user.id)
      .single();
      
    console.log('👤 [API] User profile:', profile);
    console.log('👤 [API] Profile error:', profileError);

    // First check if the estimate exists and get its details
    const { data: existingEstimate, error: checkError } = await supabase
      .from("estimates")
      .select("id, creator_name, creator_role, created_by")
      .eq("id", id)
      .single();

    if (checkError) {
      console.error('🚨 [API] Error checking estimate existence:', checkError);
      console.error('🚨 [API] Detailed check error:', JSON.stringify(checkError, null, 2));
      return { 
        data: false, 
        error: new Error(`Failed to verify estimate exists: ${checkError.message}`) 
      };
    }

    if (!existingEstimate) {
      console.error('🚨 [API] Estimate not found:', id);
      return { 
        data: false, 
        error: new Error("Estimate not found") 
      };
    }

    console.log('📋 [API] Estimate details:', existingEstimate);
    console.log('🔍 [API] User role:', profile?.role);
    console.log('🔍 [API] User can delete?', profile?.role === 'admin' || profile?.role === 'manager');
    
    // Temporary hard delete until schema cache is fixed
    console.log('🗑️ [API] Attempting delete operation...');
    const { data, error } = await supabase
      .from("estimates")
      .delete()
      .eq("id", id);

    if (error) {
      console.error('🚨 [API] Supabase delete error:', error);
      console.error('🚨 [API] Detailed delete error:', JSON.stringify(error, null, 2));
      console.error('🚨 [API] Error code:', error.code);
      console.error('🚨 [API] Error details:', error.details);
      console.error('🚨 [API] Error hint:', error.hint);
      throw new Error(`Failed to delete estimate: ${error.message} (Code: ${error.code})`);
    }

    console.log('✅ [API] Successfully deleted estimate:', id);
    console.log('✅ [API] Delete response data:', data);

    // Track estimate deletion for analytics
    try {
      trackEvent('estimate_deleted', {
        estimate_id: id,
        deletion_reason: reason || 'Deleted by user',
        deleted_by_role: profile?.role || 'unknown',
        deleted_by_name: profile?.full_name || 'Unknown',
        timestamp: new Date().toISOString(),
        action: 'delete'
      });
    } catch (trackingError) {
      console.warn('Failed to track estimate deletion:', trackingError);
    }

    return { data: true, error: null };
  } catch (error) {
    console.error("🚨 [API] Error in deleteEstimate:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return {
      data: false,
      error: new Error(`Delete operation failed: ${errorMessage}`)
    };
  }
};

/**
 * Get all soft-deleted estimates (Admin only)
 */
export const getDeletedEstimates = async (): Promise<{
  data: Estimate[];
  error: Error | null;
}> => {
  try {
    if (!isSupabaseConfigured()) {
      return { data: [], error: new Error("Supabase not configured") };
    }
    
    const { data, error } = await supabase
      .from("estimates")
      .select("*")
      .not("deleted_at", "is", null) // Only get soft-deleted estimates
      .order("deleted_at", { ascending: false });

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
    console.error("Error fetching deleted estimates:", error);
    return { data: [], error: error instanceof Error ? error : new Error("Unknown error occurred") };
  }
};

/**
 * Restore a soft-deleted estimate (Admin only)
 */
export const restoreEstimate = async (id: string): Promise<{
  data: boolean;
  error: Error | null;
}> => {
  try {
    if (!isSupabaseConfigured()) {
      return { data: false, error: new Error("Supabase not configured") };
    }

    // Restore the estimate by clearing the soft delete fields
    const { data, error } = await supabase
      .from("estimates")
      .update({
        deleted_at: null,
        deleted_by: null,
        deletion_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .not("deleted_at", "is", null) // Only restore if it's currently deleted
      .select();

    if (error) {
      throw error;
    }

    // If no rows were affected, the estimate wasn't found or wasn't deleted
    if (!data || data.length === 0) {
      return { 
        data: false, 
        error: new Error("Estimate not found or not deleted") 
      };
    }

    // Track estimate restoration for analytics
    try {
      trackEvent('admin_estimate_restored', {
        estimate_id: id,
        timestamp: new Date().toISOString(),
        action: 'restore'
      });
    } catch (trackingError) {
      console.warn('Failed to track estimate restoration:', trackingError);
    }

    return { data: true, error: null };
  } catch (error) {
    console.error("Error restoring estimate:", error);
    return {
      data: false,
      error: error instanceof Error ? error : new Error("Unknown error occurred")
    };
  }
};

/**
 * Permanently delete an estimate (Admin only - use with extreme caution)
 */
export const permanentlyDeleteEstimate = async (id: string): Promise<{
  data: boolean;
  error: Error | null;
}> => {
  try {
    if (!isSupabaseConfigured()) {
      return { data: false, error: new Error("Supabase not configured") };
    }

    // This actually permanently removes the record from the database
    const { error } = await supabase
      .from("estimates")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    // Track permanent deletion for analytics
    try {
      trackEvent('admin_estimate_permanently_deleted', {
        estimate_id: id,
        timestamp: new Date().toISOString(),
        action: 'permanent_delete'
      });
    } catch (trackingError) {
      console.warn('Failed to track permanent deletion:', trackingError);
    }

    return { data: true, error: null };
  } catch (error) {
    console.error("Error permanently deleting estimate:", error);
    return {
      data: false,
      error: error instanceof Error ? error : new Error("Unknown error occurred")
    };
  }
};

/**
 * Admin action tracking for PostHog
 */
export const trackAdminAction = (action: string, estimateId: string, additionalData?: Record<string, any>) => {
  try {
    trackEvent('admin_action', {
      action,
      estimate_id: estimateId,
      timestamp: new Date().toISOString(),
      ...additionalData
    });
  } catch (error) {
    console.warn('Failed to track admin action:', error);
  }
};