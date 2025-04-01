import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { MeasurementValues } from "@/components/estimates/measurement/types";
import { Material } from "@/components/estimates/materials/types";
import { LaborRates } from "@/components/estimates/pricing/LaborProfitTab";

// Define the status type for estimates
export type EstimateStatus = "draft" | "pending" | "approved" | "rejected";

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
