/**
 * Supabase Storage Adapter
 * Production implementation using Supabase for auto-save persistence
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  StorageAPI, 
  EstimateKey, 
  EstimateData, 
  EstimateMetadata, 
  SaveResult, 
  StorageError,
  isValidEstimateData 
} from '@/types/storage';

/**
 * Convert EstimateKey to database ID
 */
function keyToId(key: EstimateKey): string {
  return key.replace('estimate:', '');
}

/**
 * Convert database ID to EstimateKey
 */
function idToKey(id: string): EstimateKey {
  return `estimate:${id}`;
}

/**
 * Create a typed storage error
 */
function createStorageError(
  code: StorageError['code'], 
  message: string, 
  retryable: boolean = false
): StorageError {
  return { code, message, retryable };
}

/**
 * Parse Supabase error and convert to StorageError
 */
function parseSupabaseError(error: any): StorageError {
  // Network or connection errors
  if (!navigator.onLine || error?.message?.includes('fetch')) {
    return createStorageError('NETWORK_ERROR', 'Network connection failed', true);
  }
  
  // Auth errors
  if (error?.code === 'PGRST301' || error?.message?.includes('JWT')) {
    return createStorageError('NETWORK_ERROR', 'Authentication failed', false);
  }
  
  // Version conflict (from our RPC function)
  if (error?.message?.includes('VERSION_CONFLICT')) {
    return createStorageError('VERSION_CONFLICT', 'Data was modified by another session', false);
  }
  
  // Validation errors
  if (error?.code?.startsWith('23') || error?.message?.includes('constraint')) {
    return createStorageError('VALIDATION_ERROR', 'Invalid data format', false);
  }
  
  // RLS or permission errors
  if (error?.code === 'PGRST116' || error?.message?.includes('policy')) {
    return createStorageError('VALIDATION_ERROR', 'Permission denied', false);
  }
  
  // Generic error with retry capability for 5xx errors
  const isServerError = error?.status >= 500 && error?.status < 600;
  return createStorageError(
    'UNKNOWN_ERROR', 
    error?.message || 'Unknown error occurred',
    isServerError
  );
}

/**
 * Production Supabase storage adapter
 */
export class SupabaseStorageAdapter implements StorageAPI {
  /**
   * Save estimate data to Supabase
   */
  async save<T extends EstimateData>(key: EstimateKey, data: T): Promise<SaveResult> {
    try {
      // Validate data structure
      if (!isValidEstimateData(data)) {
        return {
          success: false,
          error: createStorageError('VALIDATION_ERROR', 'Invalid EstimateData structure', false)
        };
      }

      const id = keyToId(key);
      
      // Use upsert to handle both create and update
      const { data: result, error } = await (supabase as any)
        .from('estimate_drafts')
        .upsert({
          id,
          estimate_data: data,
          version: data.version
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select('version')
        .single();

      if (error) {
        console.error('[SupabaseStorageAdapter] Save failed:', error);
        return {
          success: false,
          error: parseSupabaseError(error)
        };
      }

      console.log(`[SupabaseStorageAdapter] Saved ${key} successfully, version: ${result.version}`);

      return {
        success: true,
        version: result.version
      };

    } catch (error) {
      console.error('[SupabaseStorageAdapter] Save exception:', error);
      return {
        success: false,
        error: parseSupabaseError(error)
      };
    }
  }

  /**
   * Load estimate data from Supabase
   */
  async load<T extends EstimateData>(key: EstimateKey): Promise<T | null> {
    try {
      const id = keyToId(key);
      
      const { data, error } = await (supabase as any)
        .from('estimate_drafts')
        .select('estimate_data, version, updated_at')
        .eq('id', id)
        .single();

      // Record not found is not an error
      if (error && error.code === 'PGRST116') {
        return null;
      }

      if (error) {
        console.error('[SupabaseStorageAdapter] Load failed:', error);
        throw error;
      }

      if (!data?.estimate_data) {
        return null;
      }

      // Validate the loaded data
      if (!isValidEstimateData(data.estimate_data)) {
        console.warn('[SupabaseStorageAdapter] Invalid data structure found:', data.estimate_data);
        return null;
      }

      // Ensure version and timestamps are up to date
      const estimateData = {
        ...data.estimate_data,
        version: data.version,
        updatedAt: data.updated_at
      } as T;

      console.log(`[SupabaseStorageAdapter] Loaded ${key}, version: ${data.version}`);
      return estimateData;

    } catch (error) {
      console.error('[SupabaseStorageAdapter] Load exception:', error);
      return null;
    }
  }

  /**
   * Delete estimate data from Supabase
   */
  async delete(key: EstimateKey): Promise<void> {
    try {
      const id = keyToId(key);
      
      const { error } = await (supabase as any)
        .from('estimate_drafts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[SupabaseStorageAdapter] Delete failed:', error);
        throw error;
      }

      console.log(`[SupabaseStorageAdapter] Deleted ${key}`);

    } catch (error) {
      console.error('[SupabaseStorageAdapter] Delete exception:', error);
      throw error;
    }
  }

  /**
   * List all estimate metadata for the current user
   */
  async list(): Promise<EstimateMetadata[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('estimate_drafts')
        .select('id, estimate_data->id, estimate_data->pdfFileName, estimate_data->estimateType, version, updated_at, created_at')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('[SupabaseStorageAdapter] List failed:', error);
        return [];
      }

      if (!data) {
        return [];
      }

      // Transform to EstimateMetadata format
      const metadata: EstimateMetadata[] = data
        .filter(item => item.id && item.version) // Ensure valid records
        .map(item => ({
          id: item.id,
          pdfFileName: (item as any)['estimate_data->pdfFileName'] || '',
          estimateType: (item as any)['estimate_data->estimateType'] || null,
          version: item.version,
          updatedAt: item.updated_at,
          createdAt: item.created_at
        }));

      console.log(`[SupabaseStorageAdapter] Listed ${metadata.length} draft estimates`);
      return metadata;

    } catch (error) {
      console.error('[SupabaseStorageAdapter] List exception:', error);
      return [];
    }
  }

  /**
   * Check if estimate exists in Supabase
   */
  async exists(key: EstimateKey): Promise<boolean> {
    try {
      const id = keyToId(key);
      
      const { data, error } = await (supabase as any)
        .from('estimate_drafts')
        .select('id')
        .eq('id', id)
        .single();

      // Record not found
      if (error && error.code === 'PGRST116') {
        return false;
      }

      if (error) {
        console.error('[SupabaseStorageAdapter] Exists check failed:', error);
        return false;
      }

      return !!data;

    } catch (error) {
      console.error('[SupabaseStorageAdapter] Exists exception:', error);
      return false;
    }
  }

  /**
   * Save with version check using RPC for optimistic locking
   */
  async saveWithVersion<T extends EstimateData>(
    key: EstimateKey, 
    data: T, 
    expectedVersion: number
  ): Promise<SaveResult> {
    try {
      // Validate data structure
      if (!isValidEstimateData(data)) {
        return {
          success: false,
          error: createStorageError('VALIDATION_ERROR', 'Invalid EstimateData structure', false)
        };
      }

      const id = keyToId(key);
      
      // Call our RPC function for atomic version checking
      const { data: result, error } = await supabase
        .rpc('save_estimate_with_version', {
          p_id: id,
          p_data: data,
          p_expected_version: expectedVersion
        })
        .single();

      if (error) {
        console.error('[SupabaseStorageAdapter] SaveWithVersion RPC failed:', error);
        return {
          success: false,
          error: parseSupabaseError(error)
        };
      }

      if (!result) {
        return {
          success: false,
          error: createStorageError('UNKNOWN_ERROR', 'No result from version save', true)
        };
      }

      // Check if save was successful
      if (result.success) {
        console.log(`[SupabaseStorageAdapter] SaveWithVersion successful, new version: ${result.new_version}`);
        return {
          success: true,
          version: result.new_version
        };
      } else {
        // Version conflict detected
        console.warn(`[SupabaseStorageAdapter] Version conflict: expected ${expectedVersion}, got ${result.new_version}`);
        
        // Parse conflict data if available
        let conflictData: EstimateData | undefined;
        if (result.conflict_data && isValidEstimateData(result.conflict_data)) {
          conflictData = result.conflict_data;
        }

        return {
          success: false,
          error: createStorageError('VERSION_CONFLICT', 'Data was modified by another session', false),
          conflictData
        };
      }

    } catch (error) {
      console.error('[SupabaseStorageAdapter] SaveWithVersion exception:', error);
      return {
        success: false,
        error: parseSupabaseError(error)
      };
    }
  }

  /**
   * Get current user for debugging
   */
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  /**
   * Health check for the adapter
   */
  async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    try {
      // Try a simple query to check connection
      const { error } = await supabase
        .from('estimate_drafts')
        .select('id')
        .limit(1);

      if (error) {
        return {
          healthy: false,
          message: `Database connection failed: ${error.message}`
        };
      }

      return {
        healthy: true,
        message: 'Supabase connection healthy'
      };

    } catch (error) {
      return {
        healthy: false,
        message: `Health check failed: ${error}`
      };
    }
  }
} 