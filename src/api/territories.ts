import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";

export interface Territory {
  id?: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

const table = "territories";

export const getTerritories = async (): Promise<{ data: Territory[]; error: Error | null }> => {
  if (!isSupabaseConfigured()) return { data: [], error: new Error("Supabase not configured") };
  
  // TODO: Add caching once territories table is deployed to database schema
  // const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: true });
  // return { data: (data || []) as Territory[], error: error as any };
  
  // For now, return empty data since table doesn't exist in current schema
  console.warn('⚠️ [Territories] Table not in database schema, returning empty data');
  return { data: [], error: null };
};

export const createTerritory = async (name: string): Promise<{ data: Territory | null; error: Error | null }> => {
  if (!isSupabaseConfigured()) return { data: null, error: new Error("Supabase not configured") };
  // TODO: Implement once territories table is deployed
  console.warn('⚠️ [Territories] Create not implemented - table not in schema');
  return { data: null, error: new Error("Territories table not in database schema") };
};

export const updateTerritory = async (id: string, name: string): Promise<{ data: Territory | null; error: Error | null }> => {
  if (!isSupabaseConfigured()) return { data: null, error: new Error("Supabase not configured") };
  // TODO: Implement once territories table is deployed
  console.warn('⚠️ [Territories] Update not implemented - table not in schema');
  return { data: null, error: new Error("Territories table not in database schema") };
};

export const deleteTerritory = async (id: string): Promise<{ error: Error | null }> => {
  if (!isSupabaseConfigured()) return { error: new Error("Supabase not configured") };
  // TODO: Implement once territories table is deployed
  console.warn('⚠️ [Territories] Delete not implemented - table not in schema');
  return { error: new Error("Territories table not in database schema") };
}; 