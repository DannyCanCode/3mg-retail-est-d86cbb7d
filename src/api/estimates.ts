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

    const updateData: { status: EstimateStatus, updated_at: string, notes?: string } = {
      status,
      updated_at: new Date().toISOString()
    };
    
    if (notes) {
      updateData.notes = notes;
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
  
  return {
      ...updatedEstimate,
      status: updatedEstimate.status as EstimateStatus,
      materials: typeof updatedEstimate.materials === 'string' ? JSON.parse(updatedEstimate.materials) : (updatedEstimate.materials || {}),
      quantities: typeof updatedEstimate.quantities === 'string' ? JSON.parse(updatedEstimate.quantities) : (updatedEstimate.quantities || {}),
      labor_rates: typeof updatedEstimate.labor_rates === 'string' ? JSON.parse(updatedEstimate.labor_rates) : (updatedEstimate.labor_rates || {}),
      measurements: typeof updatedEstimate.measurements === 'string' ? JSON.parse(updatedEstimate.measurements) : (updatedEstimate.measurements || { areasByPitch: [] }),
  } as Estimate; 
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