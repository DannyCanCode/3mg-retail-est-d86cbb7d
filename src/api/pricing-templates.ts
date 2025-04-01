import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { LaborRates } from "@/components/estimates/pricing/LaborProfitTab";
import { Material } from "@/components/estimates/materials/types";

// Pricing template type
export interface PricingTemplate {
  id?: string;
  name: string;
  description: string;
  materials: {[key: string]: Material};
  quantities: {[key: string]: number};
  labor_rates: LaborRates;
  profit_margin: number;
  created_at?: string;
  updated_at?: string;
  is_default?: boolean;
}

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

    // Fetch templates, order by creation date (newest first)
    const { data, error } = await supabase
      .from("pricing_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error fetching templates:", error);
      throw error;
    }

    console.log(`API: Retrieved ${data?.length || 0} templates`);

    // Parse JSONB fields
    const parsedData = data.map(template => {
      try {
        return {
          ...template,
          materials: JSON.parse(template.materials || "{}"),
          quantities: JSON.parse(template.quantities || "{}"),
          labor_rates: JSON.parse(template.labor_rates || "{}")
        };
      } catch (parseError) {
        console.error("Error parsing template data:", parseError, template);
        return template; // Return unparsed data rather than failing
      }
    });

    return { data: parsedData, error: null };
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

    // Parse JSONB fields
    try {
      const parsedData = {
        ...data,
        materials: JSON.parse(data.materials || "{}"),
        quantities: JSON.parse(data.quantities || "{}"),
        labor_rates: JSON.parse(data.labor_rates || "{}")
      };

      return { data: parsedData, error: null };
    } catch (parseError) {
      console.error("Error parsing template data:", parseError, data);
      return { data: null, error: new Error("Error parsing template data") };
    }
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
export const createPricingTemplate = async (template: PricingTemplate): Promise<{
  data: PricingTemplate | null;
  error: Error | null;
}> => {
  try {
    console.log("API: Creating new pricing template:", template.name);
    
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.warn("Supabase not configured, cannot create pricing template");
      return { data: null, error: new Error("Supabase not configured") };
    }

    // If this is a default template, we need to unset any existing defaults
    if (template.is_default) {
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
    try {
      const templateToInsert = {
        ...template,
        // Convert objects to JSON strings for Supabase
        materials: JSON.stringify(template.materials || {}),
        quantities: JSON.stringify(template.quantities || {}),
        labor_rates: JSON.stringify(template.labor_rates || {}),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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

      // Parse JSONB fields for return
      const parsedData = {
        ...data,
        materials: JSON.parse(data.materials || "{}"),
        quantities: JSON.parse(data.quantities || "{}"),
        labor_rates: JSON.parse(data.labor_rates || "{}")
      };

      return { data: parsedData, error: null };
    } catch (jsonError) {
      console.error("Error stringifying template data:", jsonError);
      return { data: null, error: new Error("Error preparing template data") };
    }
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
    try {
      const templateToUpdate = {
        ...template,
        // Convert objects to JSON strings for Supabase
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

      // Parse JSONB fields for return
      const parsedData = {
        ...data,
        materials: JSON.parse(data.materials || "{}"),
        quantities: JSON.parse(data.quantities || "{}"),
        labor_rates: JSON.parse(data.labor_rates || "{}")
      };

      return { data: parsedData, error: null };
    } catch (jsonError) {
      console.error("Error stringifying template data:", jsonError);
      return { data: null, error: new Error("Error preparing template data") };
    }
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

    // Parse JSONB fields
    try {
      const parsedData = {
        ...data,
        materials: JSON.parse(data.materials || "{}"),
        quantities: JSON.parse(data.quantities || "{}"),
        labor_rates: JSON.parse(data.labor_rates || "{}")
      };

      return { data: parsedData, error: null };
    } catch (parseError) {
      console.error("Error parsing default template data:", parseError, data);
      return { data: null, error: new Error("Error parsing template data") };
    }
  } catch (error) {
    console.error("Error fetching default pricing template:", error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Unknown error occurred")
    };
  }
}; 