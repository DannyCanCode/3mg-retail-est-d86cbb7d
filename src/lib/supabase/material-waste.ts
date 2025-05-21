import { supabase } from '../../integrations/supabase/client';

/**
 * Fetch material waste percentage for a specific material
 * @param materialId Material ID to fetch waste percentage for
 * @returns Waste percentage as a number between 0-100 or null if not found
 */
export const getMaterialWastePercentage = async (materialId: string): Promise<number | null> => {
  const { data, error } = await supabase
    .from('material_waste_percentage')
    .select('waste_percentage')
    .eq('material_id', materialId)
    .single();
  
  if (error || !data) {
    console.warn(`Failed to fetch waste percentage for material ${materialId}:`, error);
    return null;
  }
  
  return data.waste_percentage;
};

/**
 * Fetch waste percentages for all materials
 * @returns Object mapping material_id to waste_percentage
 */
export const getAllMaterialWastePercentages = async (): Promise<Record<string, number>> => {
  const { data, error } = await supabase
    .from('material_waste_percentage')
    .select('material_id, waste_percentage');
  
  if (error || !data) {
    console.warn('Failed to fetch material waste percentages:', error);
    return {};
  }
  
  // Convert array to an object with material_id as keys and waste_percentage as values
  return data.reduce((acc, item) => {
    acc[item.material_id] = item.waste_percentage;
    return acc;
  }, {} as Record<string, number>);
};

/**
 * Update waste percentage for a specific material
 * @param materialId Material ID to update
 * @param wastePercentage New waste percentage (0-100)
 * @returns True if successful, false otherwise
 */
export const updateMaterialWastePercentage = async (materialId: string, wastePercentage: number): Promise<boolean> => {
  // Validate input
  if (wastePercentage < 0 || wastePercentage > 100) {
    console.error('Waste percentage must be between 0 and 100');
    return false;
  }
  
  const { data, error } = await supabase
    .from('material_waste_percentage')
    .upsert(
      { material_id: materialId, waste_percentage: wastePercentage, updated_at: new Date() },
      { onConflict: 'material_id' }
    );
  
  if (error) {
    console.error('Error updating material waste percentage:', error);
    return false;
  }
  
  return true;
};

/**
 * Delete waste percentage record for a specific material
 * @param materialId Material ID to delete
 * @returns True if successful, false otherwise
 */
export const deleteMaterialWastePercentage = async (materialId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('material_waste_percentage')
    .delete()
    .eq('material_id', materialId);
  
  if (error) {
    console.error('Error deleting material waste percentage:', error);
    return false;
  }
  
  return true;
}; 