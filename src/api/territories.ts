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
  const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: true });
  return { data: (data || []) as Territory[], error: error as any };
};

export const createTerritory = async (name: string): Promise<{ data: Territory | null; error: Error | null }> => {
  if (!isSupabaseConfigured()) return { data: null, error: new Error("Supabase not configured") };
  const { data, error } = await supabase.from(table).insert({ name }).single();
  return { data: data as Territory | null, error: error as any };
};

export const updateTerritory = async (id: string, name: string): Promise<{ data: Territory | null; error: Error | null }> => {
  if (!isSupabaseConfigured()) return { data: null, error: new Error("Supabase not configured") };
  const { data, error } = await supabase.from(table).update({ name }).eq("id", id).single();
  return { data: data as Territory | null, error: error as any };
};

export const deleteTerritory = async (id: string): Promise<{ error: Error | null }> => {
  if (!isSupabaseConfigured()) return { error: new Error("Supabase not configured") };
  const { error } = await supabase.from(table).delete().eq("id", id);
  return { error: error as any };
}; 