import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { cache } from '@/lib/cache';
import { LaborRates } from "@/components/estimates/pricing/LaborProfitTab";
import { Material } from "@/components/estimates/materials/types";
import type { Database } from "@/integrations/supabase/database.types"; // Import DB types
import type { Json } from "@/integrations/supabase/database.types"; // Import Json type

// Define the specific table type alias
type PricingTemplatesTable = Database['public']['Tables']['pricing_templates']
type PricingTemplateRow = PricingTemplatesTable['Row']
type PricingTemplateInsert = PricingTemplatesTable['Insert']
type PricingTemplateUpdate = PricingTemplatesTable['Update']

// Pricing template type using Row type + parsed fields
export interface PricingTemplate extends Omit<PricingTemplateRow, 'materials' | 'quantities' | 'labor_rates'> {
  materials: {[key: string]: Material}; // Keep parsed type
  quantities: {[key: string]: number}; // Keep parsed type
  labor_rates: LaborRates; // Keep parsed type
}

// Function to safely parse potentially already parsed JSON
// Updated to accept Supabase Json type
const safeJsonParse = (field: Json | null | undefined): object => {
    if (!field) return {};
    if (typeof field === 'object' && field !== null && !Array.isArray(field)) { // Check if it's a non-array object
        // Already likely a parsed object or needs no parsing
        return field as object; 
    } 
    if (typeof field === 'string') {
        try {
            return JSON.parse(field);
        } catch (e) {
            console.error("Failed to parse JSON string field:", e, field);
            return {}; // Return empty object on string parse error
        }
    }
    // If it's an array, number, boolean, or null, it's not the expected object structure
    console.warn("Unexpected type for JSON field, returning empty object:", typeof field, field);
    return {}; 
};

/**
 * Get all pricing templates
 */
export const getPricingTemplates = async (): Promise<{
  data: PricingTemplate[] | null;
  error: Error | null;
}> => {
  try {
    console.log("API: Getting all pricing templates");
    
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.warn("Supabase not configured, cannot fetch pricing templates");
      return { data: [], error: new Error("Supabase not configured") };
    }

    // 🚀 PERFORMANCE: Check cache first
    const cachedTemplates = cache.pricingTemplates.get();
    if (cachedTemplates) {
      console.log('⚡ [PricingTemplates] Using cached data');
      return { data: cachedTemplates, error: null };
    }

    // 📊 PERFORMANCE: Track API call timing
    const startTime = performance.now();

    // Fetch templates, order by creation date (newest first)
    const { data, error } = await supabase
      .from("pricing_templates")
      .select("*")
      .order("created_at", { ascending: false });

    const apiTime = performance.now() - startTime;
    console.log(`📊 [PricingTemplates] API call took ${apiTime.toFixed(2)}ms`);

    if (error) {
      console.error("Supabase error fetching templates:", error);
      throw error;
    }

    console.log(`API: Retrieved ${data?.length || 0} templates`);

    // Map using the Row type initially
    const parsedData = (data as PricingTemplateRow[] | null)?.map(template => ({
        ...template,
        materials: safeJsonParse(template.materials),
        quantities: safeJsonParse(template.quantities),
        labor_rates: safeJsonParse(template.labor_rates)
      }
    ));
    
    const templates = parsedData as PricingTemplate[] || [];
    
    // 🚀 PERFORMANCE: Cache the results
    cache.pricingTemplates.set(templates);
    console.log(`💾 [PricingTemplates] Cached ${templates.length} templates`);
    
    return { data: templates, error: null };
  } catch (error) {
    console.error("Error fetching pricing templates:", error);
    return {
      data: [],
      error: error instanceof Error ? error : new Error("Unknown error occurred")
    };
  }
};

/**
 * Get a specific pricing template by ID
 */
export const getPricingTemplateById = async (id: string): Promise<{
  data: PricingTemplate | null;
  error: Error | null;
}> => {
  try {
    console.log(`API: Getting pricing template with ID ${id}`);
    
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.warn("Supabase not configured, cannot fetch pricing template");
      return { data: null, error: new Error("Supabase not configured") };
    }

    const { data, error } = await supabase
      .from("pricing_templates")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error(`Supabase error fetching template with ID ${id}:`, error);
      throw error;
    }

    console.log(`API: Retrieved template: ${data?.name}`);

    const rowData = data as PricingTemplateRow | null;
    if (!rowData) return { data: null, error: null };

    const parsedData: PricingTemplate = {
        ...rowData,
        materials: safeJsonParse(rowData.materials) as Record<string, Material>,
        quantities: safeJsonParse(rowData.quantities) as Record<string, number>,
        labor_rates: safeJsonParse(rowData.labor_rates) as LaborRates
    };
    return { data: parsedData, error: null };
  } catch (error) {
    console.error(`Error fetching pricing template with ID ${id}:`, error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Unknown error occurred")
    };
  }
};

/**
 * Create a new pricing template
 */
export const createPricingTemplate = async (templateData: Omit<PricingTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<{
  data: PricingTemplate | null;
  error: Error | null;
}> => {
  try {
    console.log("API: Creating new pricing template:", templateData.name);
    
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.warn("Supabase not configured, cannot create pricing template");
      return { data: null, error: new Error("Supabase not configured") };
    }

    // If this is a default template, we need to unset any existing defaults
    if (templateData.is_default) {
      console.log("API: Template is marked as default, unsetting other defaults");
      
      const { error: updateError } = await supabase
        .from("pricing_templates")
        .update({ is_default: false })
        .eq("is_default", true);
      
      if (updateError) {
        console.warn("Error updating existing default templates:", updateError);
      }
    }

    // Prepare template for database insertion
    const templateToInsert: PricingTemplateInsert = {
        ...templateData,
        materials: JSON.stringify(templateData.materials || {}),
        quantities: JSON.stringify(templateData.quantities || {}),
        labor_rates: JSON.stringify(templateData.labor_rates || {})
        // created_at/updated_at are handled by DB or omitted if defaulted
    };

    console.log("API: Inserting template into database");

    const { data, error } = await supabase
      .from("pricing_templates")
      .insert(templateToInsert)
      .select()
      .single();

    if (error) {
      console.error("Supabase error creating template:", error);
      throw error;
    }

    console.log(`API: Template created with ID: ${data.id}`);

    const rowData = data as PricingTemplateRow | null;
    if (!rowData) throw new Error("Failed to retrieve created template");
    // Parse back for return
    const parsedData: PricingTemplate = {
      ...rowData,
      materials: safeJsonParse(rowData.materials) as Record<string, Material>,
      quantities: safeJsonParse(rowData.quantities) as Record<string, number>,
      labor_rates: safeJsonParse(rowData.labor_rates) as LaborRates
    };
    return { data: parsedData, error: null };
  } catch (error) {
    console.error("Error creating pricing template:", error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Unknown error occurred")
    };
  }
};

/**
 * Update an existing pricing template
 */
export const updatePricingTemplate = async (template: PricingTemplate): Promise<{
  data: PricingTemplate | null;
  error: Error | null;
}> => {
  try {
    console.log(`API: Updating pricing template with ID ${template.id}`);
    
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.warn("Supabase not configured, cannot update pricing template");
      return { data: null, error: new Error("Supabase not configured") };
    }

    // Ensure template has an ID
    if (!template.id) {
      console.error("Cannot update template without ID");
      return { data: null, error: new Error("Template ID is required for updates") };
    }

    // If this is being set as a default template, unset any existing defaults
    if (template.is_default) {
      console.log("API: Template is marked as default, unsetting other defaults");
      
      const { error: updateError } = await supabase
        .from("pricing_templates")
        .update({ is_default: false })
        .eq("is_default", true)
        .neq("id", template.id);
      
      if (updateError) {
        console.warn("Error updating existing default templates:", updateError);
      }
    }

    // Prepare template for database update
    const templateToUpdate: PricingTemplateUpdate = {
      ...template,
      id: undefined, // Don't include id in update payload
      created_at: undefined, // Don't include created_at
      materials: JSON.stringify(template.materials || {}),
      quantities: JSON.stringify(template.quantities || {}),
      labor_rates: JSON.stringify(template.labor_rates || {}),
      updated_at: new Date().toISOString()
    };

    console.log("API: Updating template in database");

    const { data, error } = await supabase
      .from("pricing_templates")
      .update(templateToUpdate)
      .eq("id", template.id)
      .select()
      .single();

    if (error) {
      console.error("Supabase error updating template:", error);
      throw error;
    }

    console.log(`API: Template updated: ${data.name}`);

    const rowData = data as PricingTemplateRow | null;
    if (!rowData) throw new Error("Failed to retrieve updated template");
    // Parse back for return
    const parsedData: PricingTemplate = {
      ...rowData,
      materials: safeJsonParse(rowData.materials) as Record<string, Material>,
      quantities: safeJsonParse(rowData.quantities) as Record<string, number>,
      labor_rates: safeJsonParse(rowData.labor_rates) as LaborRates
    };
    return { data: parsedData, error: null };
  } catch (error) {
    console.error(`Error updating pricing template with ID ${template.id}:`, error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Unknown error occurred")
    };
  }
};

/**
 * Delete a pricing template
 */
export const deletePricingTemplate = async (id: string): Promise<{
  error: Error | null;
}> => {
  try {
    console.log(`API: Deleting pricing template with ID ${id}`);
    
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.warn("Supabase not configured, cannot delete pricing template");
      return { error: new Error("Supabase not configured") };
    }

    const { error } = await supabase
      .from("pricing_templates")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Supabase error deleting template:", error);
      throw error;
    }

    console.log(`API: Template deleted successfully`);
    return { error: null };
  } catch (error) {
    console.error(`Error deleting pricing template with ID ${id}:`, error);
    return {
      error: error instanceof Error ? error : new Error("Unknown error occurred")
    };
  }
};

/**
 * Get the default pricing template
 */
export const getDefaultPricingTemplate = async (): Promise<{
  data: PricingTemplate | null;
  error: Error | null;
}> => {
  try {
    console.log("API: Getting default pricing template");
    
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.warn("Supabase not configured, cannot fetch default pricing template");
      return { data: null, error: new Error("Supabase not configured") };
    }

    const { data, error } = await supabase
      .from("pricing_templates")
      .select("*")
      .eq("is_default", true)
      .maybeSingle();

    if (error) {
      console.error("Supabase error fetching default template:", error);
      throw error;
    }

    if (!data) {
      console.log("API: No default template found");
      return { data: null, error: null };
    }

    console.log(`API: Retrieved default template: ${data.name}`);

    const rowData = data as PricingTemplateRow | null;
    if (!rowData) return { data: null, error: null };
    // Parse back for return
    const parsedData: PricingTemplate = {
      ...rowData,
      materials: safeJsonParse(rowData.materials) as Record<string, Material>,
      quantities: safeJsonParse(rowData.quantities) as Record<string, number>,
      labor_rates: safeJsonParse(rowData.labor_rates) as LaborRates
    };
    return { data: parsedData, error: null };
  } catch (error) {
    console.error("Error fetching default pricing template:", error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Unknown error occurred")
    };
  }
}; 