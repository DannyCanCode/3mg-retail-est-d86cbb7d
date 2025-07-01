import { supabase } from "@/integrations/supabase/client";

/**
 * ADMIN ONLY: Clean up all test estimates and measurements
 * This should only be used in development/testing environments
 */
export const cleanupTestData = async (): Promise<{ success: boolean; message: string; deleted: { estimates: number; measurements: number } }> => {
  try {
    console.log('🧹 Starting cleanup of test data...');
    
    // First, get the current user to ensure they're an admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    // Check if user is admin (you can modify this check as needed)
    const adminEmails = [
      'daniel.pedraza@3mgroofing.com',
      'connor@3mgroofing.com',
      'jay.moroff@3mgroofing.com',
      'tyler.powell@3mgroofing.com'
    ];
    
    if (!adminEmails.includes(user.email?.toLowerCase() || '')) {
      throw new Error('Only admins can clean up test data');
    }
    
    // Get count of estimates before deletion
    const { data: estimatesBeforeDelete, error: estimatesCountError } = await supabase
      .from('estimates')
      .select('id');
    
    if (estimatesCountError) {
      throw new Error(`Error counting estimates: ${estimatesCountError.message}`);
    }
    
    const estimateCount = estimatesBeforeDelete?.length || 0;
    console.log(`📊 Found ${estimateCount} estimates to delete`);
    
    // Get count of measurements before deletion
    const { data: measurementsBeforeDelete, error: measurementsCountError } = await supabase
      .from('measurements')
      .select('id');
    
    if (measurementsCountError) {
      throw new Error(`Error counting measurements: ${measurementsCountError.message}`);
    }
    
    const measurementCount = measurementsBeforeDelete?.length || 0;
    console.log(`📊 Found ${measurementCount} measurements to delete`);
    
    // Delete all estimates
    console.log('🗑️ Deleting all estimates...');
    const { error: estimatesDeleteError } = await supabase
      .from('estimates')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (estimatesDeleteError) {
      throw new Error(`Error deleting estimates: ${estimatesDeleteError.message}`);
    }
    
    // Delete all measurements
    console.log('🗑️ Deleting all measurements...');
    const { error: measurementsDeleteError } = await supabase
      .from('measurements')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (measurementsDeleteError) {
      throw new Error(`Error deleting measurements: ${measurementsDeleteError.message}`);
    }
    
    console.log('✅ Cleanup completed successfully!');
    
    return {
      success: true,
      message: 'Test data cleanup completed successfully',
      deleted: {
        estimates: estimateCount,
        measurements: measurementCount
      }
    };
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred during cleanup',
      deleted: {
        estimates: 0,
        measurements: 0
      }
    };
  }
};

/**
 * Quick function to run cleanup from browser console
 * Usage: Open browser console and run: window.cleanupTestData()
 */
if (typeof window !== 'undefined') {
  (window as any).cleanupTestData = cleanupTestData;
} 