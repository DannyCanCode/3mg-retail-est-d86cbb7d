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
}

/**
 * Save a new estimate to the database with "pending" status
 */
export const saveEstimate = async (estimate: Omit<Estimate, "status" | "created_at" | "updated_at">): Promise<{
  data: any;
  error: Error | null;
}> => {
  try {
    // Log the received data for debugging
    console.log("saveEstimate received data:", estimate);
    
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.warn("Supabase not configured, estimate will not be saved to database");
      return { data: null, error: new Error("Supabase not configured") };
    }

    // Log the Supabase configuration
    console.log("Supabase is configured, proceeding with save");

    const now = new Date().toISOString();
    
    try {
      // Check for required fields before saving
      if (!estimate.customer_address) {
        throw new Error("Missing required field: customer_address");
      }
      
      if (typeof estimate.total_price !== 'number' || isNaN(estimate.total_price)) {
        throw new Error(`Invalid total_price: ${estimate.total_price} (${typeof estimate.total_price})`);
      }
      
      // Use a safer JSON stringify with circular reference detection
      const safeStringify = (obj: any) => {
        const seen = new WeakSet();
        return JSON.stringify(obj, (key, value) => {
          if (key === 'parent' || key === 'dom' || key === 'listeners') {
            return undefined; // Skip problematic browser-related properties
          }
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
              return '[Circular Reference]';
            }
            seen.add(value);
          }
          return value;
        });
      };

      // Prepare estimate data
      const estimateData = {
        ...estimate,
        status: "pending" as EstimateStatus,
        created_at: now,
        updated_at: now,
        // Convert non-string values to JSON with safer stringification
        materials: safeStringify(estimate.materials),
        quantities: safeStringify(estimate.quantities),
        labor_rates: safeStringify(estimate.labor_rates),
        measurements: safeStringify(estimate.measurements)
      };
      
      console.log("Prepared estimate data:", estimateData);
      
      // Insert the estimate into the database
      console.log("Sending data to Supabase...");
      const { data, error } = await supabase
        .from("estimates")
        .insert(estimateData)
        .select()
        .single();

      console.log("Supabase response:", { data, error });

      if (error) {
        console.error("Supabase error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      return { data, error: null };
    } catch (jsonError) {
      console.error("Error during data preparation or saving:", jsonError);
      if (jsonError instanceof Error) {
        console.error("Error stack:", jsonError.stack);
      }
      return {
        data: null,
        error: jsonError instanceof Error ? jsonError : new Error("Error preparing estimate data")
      };
    }
  } catch (error) {
    console.error("Error saving estimate:", error);
    
    // More detailed error logging based on error type
    if (error instanceof Response) {
      console.error("Response status:", error.status);
      try {
        const errorJson = await error.json();
        console.error("Response error JSON:", errorJson);
      } catch (e) {
        console.error("Could not parse error response as JSON");
      }
    }
    
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Unknown error occurred")
    };
  }
};

/**
 * Get all estimates with optional filtering by status
 */
export const getEstimates = async (status?: EstimateStatus): Promise<{
  data: any[];
  error: Error | null;
}> => {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.warn("Supabase not configured, cannot fetch estimates");
      return { data: [], error: new Error("Supabase not configured") };
    }

    // Start the query
    let query = supabase.from("estimates").select("*");
    
    // Add status filter if provided
    if (status) {
      query = query.eq("status", status);
    }
    
    // Order by created_at date (newest first)
    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Parse JSON string fields back to objects
    const parsedData = data.map(estimate => ({
      ...estimate,
      materials: JSON.parse(estimate.materials || "{}"),
      quantities: JSON.parse(estimate.quantities || "{}"),
      labor_rates: JSON.parse(estimate.labor_rates || "{}"),
      measurements: JSON.parse(estimate.measurements || "{}")
    }));

    return { data: parsedData, error: null };
  } catch (error) {
    console.error("Error fetching estimates:", error);
    return {
      data: [],
      error: error instanceof Error ? error : new Error("Unknown error occurred")
    };
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
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.warn("Supabase not configured, cannot fetch estimate");
      return { data: null, error: new Error("Supabase not configured") };
    }

    const { data, error } = await supabase
      .from("estimates")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw error;
    }

    // Parse JSON string fields back to objects
    const parsedData = {
      ...data,
      materials: JSON.parse(data.materials || "{}"),
      quantities: JSON.parse(data.quantities || "{}"),
      labor_rates: JSON.parse(data.labor_rates || "{}"),
      measurements: JSON.parse(data.measurements || "{}")
    };

    return { data: parsedData, error: null };
  } catch (error) {
    console.error("Error fetching estimate:", error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Unknown error occurred")
    };
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
  laborRates: LaborRates,
  profitMargin: number
): number => {
  // Calculate materials cost
  let materialCost = 0;
  for (const materialId in materials) {
    const material = materials[materialId];
    const quantity = quantities[materialId] || 0;
    materialCost += material.price * quantity;
  }

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

  // Apply profit margin
  const profitMultiplier = 1 + (profitMargin / 100);
  const total = subtotal * profitMultiplier;

  return Math.round(total); // Round to nearest dollar
};

// --- Helper Function for Cost Calculation ---
// NOTE: This logic MUST precisely match the calculations used in EstimateSummaryTab.tsx
//       Consider refactoring the logic from EstimateSummaryTab into a shared utility
//       function to avoid duplication and ensure consistency.
const calculateFinalCosts = (estimateData: Estimate) => {
  console.log("[calculateFinalCosts] Received estimateData:", JSON.stringify(estimateData, null, 2)); // Log input

  // --- Default/Safe values ---
  const safeMeasurements = estimateData.measurements as MeasurementValues || { totalArea: 0, areasByPitch: [] };
  const selectedMaterials = estimateData.materials as Record<string, Material> || {};
  const quantities = estimateData.quantities as Record<string, number> || {};
  const laborRates = estimateData.labor_rates as LaborRates || {}; 
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
      const pitchValue = parseInt(pitch.split(/[:\/]/)[0]) || 0;
      // Add logic for special material rates if needed here, checking selectedMaterials
      // Example: Check if specific low-slope materials are present
      const hasPolyIso = Object.values(selectedMaterials).some(m => m.id === "gaf-poly-iso-4x8");
      const hasPolyglass = Object.values(selectedMaterials).some(m => m.id === "polyglass-elastoflex-sbs" || m.id === "polyglass-polyflex-app");

      if (pitchValue === 0 && hasPolyIso) return 60; // GAF Poly ISO rate
      if ((pitchValue === 1 || pitchValue === 2) && hasPolyglass) return 109; // Polyglass rate
      if (pitchValue <= 2) return 75; // Default Low Slope
      if (pitchValue >= 8) { // Steep
          const basePitchValue = 8;
          const baseRate = 90;
          const increment = 5;
          return baseRate + (pitchValue - basePitchValue) * increment;
      }
      return laborRates.laborRate || 85; // Standard (3-7) or default
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
  if (!isSupabaseConfigured) {
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

  // 1. Fetch the raw estimate data
  const { data: rawEstimateData, error: fetchError } = await supabase
    .from('estimates')
    .select('*') 
    .eq('id', estimateId)
    .single();

  if (fetchError || !rawEstimateData) {
    console.error("Error fetching estimate for 'Mark as Sold':", fetchError);
    throw new Error(`Estimate not found or error fetching: ${fetchError?.message}`);
  }

  // Parse JSON
  let parsedEstimateData: Estimate;
  try {
      parsedEstimateData = {
        ...rawEstimateData,
        materials: JSON.parse(rawEstimateData.materials || "{}"),
        quantities: JSON.parse(rawEstimateData.quantities || "{}"),
        labor_rates: JSON.parse(rawEstimateData.labor_rates || "{}"),
        measurements: JSON.parse(rawEstimateData.measurements || "{}")
      } as Estimate;
      console.log("[markEstimateAsSold] Parsed estimate data successfully:", parsedEstimateData);
  } catch (parseError) {
      console.error("[markEstimateAsSold] Error parsing estimate JSON fields:", parseError);
      throw new Error("Failed to parse estimate data.");
  }
  
  // 2. Recalculate costs 
  console.log("[markEstimateAsSold] Calling calculateFinalCosts...");
  const finalCosts = calculateFinalCosts(parsedEstimateData); 
  console.log("[markEstimateAsSold] Calculated final costs:", finalCosts);

  // 3. Prepare update data
  const updatePayload: Partial<Estimate> = {
      is_sold: true,
      sold_at: new Date().toISOString(),
      status: 'Sold', 
      job_type: jobType,
      insurance_company: jobType === 'Insurance' ? insuranceCompany : null, 
      calculated_material_cost: finalCosts.calculated_material_cost,
      calculated_labor_cost: finalCosts.calculated_labor_cost,
      calculated_subtotal: finalCosts.calculated_subtotal,
      calculated_profit_amount: finalCosts.calculated_profit_amount,
  };
  console.log("[markEstimateAsSold] Prepared update payload:", updatePayload);

  // 4. Update the estimate record
  const { data: updatedEstimate, error: updateError } = await supabase
    .from('estimates')
    .update(updatePayload)
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

  return updatedEstimate as Estimate; 
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
  total_amount: number | null;
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
      customer_address, /* Select the correct address column */
      sold_at,
      calculated_material_cost,
      calculated_labor_cost,
      calculated_subtotal,
      profit_margin, 
      calculated_profit_amount,
      total_amount
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

// --- Ensure deleteEstimate is exported if used --- 
// Example: If you have a deleteEstimate function, make sure it's exported:
// export const deleteEstimate = async (id: string): Promise<...> => { ... };
