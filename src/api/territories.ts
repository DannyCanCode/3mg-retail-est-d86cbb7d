import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";

export interface Territory {
  id?: string;
  name: string;
  region?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

const table = "territories";

export const getTerritories = async (): Promise<{ data: Territory[]; error: Error | null }> => {
  if (!isSupabaseConfigured()) return { data: [], error: new Error("Supabase not configured") };
  
  try {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("name", { ascending: true });
    
    if (error) {
      console.error('❌ [Territories] Error fetching territories:', error);
      return { data: [], error: error as any };
    }
    
    console.log('✅ [Territories] Successfully fetched territories:', data?.length || 0);
    return { data: (data || []) as Territory[], error: null };
  } catch (err) {
    console.error('❌ [Territories] Unexpected error:', err);
    return { data: [], error: err as Error };
  }
};

export const createTerritory = async (name: string): Promise<{ data: Territory | null; error: Error | null }> => {
  if (!isSupabaseConfigured()) return { data: null, error: new Error("Supabase not configured") };
  
  try {
    const { data, error } = await supabase
      .from(table)
      .insert([{ name }])
      .select()
      .single();
    
    if (error) {
      console.error('❌ [Territories] Error creating territory:', error);
      return { data: null, error: error as any };
    }
    
    console.log('✅ [Territories] Successfully created territory:', data);
    return { data: data as Territory, error: null };
  } catch (err) {
    console.error('❌ [Territories] Unexpected error creating territory:', err);
    return { data: null, error: err as Error };
  }
};

export const updateTerritory = async (id: string, name: string): Promise<{ data: Territory | null; error: Error | null }> => {
  if (!isSupabaseConfigured()) return { data: null, error: new Error("Supabase not configured") };
  
  try {
    const { data, error } = await supabase
      .from(table)
      .update({ name })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('❌ [Territories] Error updating territory:', error);
      return { data: null, error: error as any };
    }
    
    console.log('✅ [Territories] Successfully updated territory:', data);
    return { data: data as Territory, error: null };
  } catch (err) {
    console.error('❌ [Territories] Unexpected error updating territory:', err);
    return { data: null, error: err as Error };
  }
};

export const deleteTerritory = async (id: string): Promise<{ error: Error | null }> => {
  if (!isSupabaseConfigured()) return { error: new Error("Supabase not configured") };
  
  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('❌ [Territories] Error deleting territory:', error);
      return { error: error as any };
    }
    
    console.log('✅ [Territories] Successfully deleted territory');
    return { error: null };
  } catch (err) {
    console.error('❌ [Territories] Unexpected error deleting territory:', err);
    return { error: err as Error };
  }
}; 