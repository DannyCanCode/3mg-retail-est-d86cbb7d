/**
 * Mock Storage Adapter
 * localStorage-based implementation for development and testing
 * Will be replaced with Supabase adapter in Phase 3
 */

import { 
  StorageAPI, 
  EstimateKey, 
  EstimateData, 
  EstimateMetadata, 
  SaveResult, 
  StorageError,
  isValidEstimateData 
} from '@/types/storage';

const STORAGE_PREFIX = 'auto_save_';
const METADATA_KEY = 'auto_save_metadata';

/**
 * Generate a storage error with proper typing
 */
function createStorageError(
  code: StorageError['code'], 
  message: string, 
  retryable: boolean = false
): StorageError {
  return { code, message, retryable };
}

/**
 * Get the localStorage key for an estimate
 */
function getStorageKey(key: EstimateKey): string {
  return STORAGE_PREFIX + key;
}

/**
 * Get all estimate metadata from localStorage
 */
function getMetadata(): EstimateMetadata[] {
  try {
    const stored = localStorage.getItem(METADATA_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('[MockStorageAdapter] Failed to parse metadata:', error);
    return [];
  }
}

/**
 * Update estimate metadata in localStorage
 */
function updateMetadata(metadata: EstimateMetadata[]): void {
  try {
    localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
  } catch (error) {
    console.warn('[MockStorageAdapter] Failed to save metadata:', error);
  }
}

/**
 * Mock storage adapter using localStorage
 * Simulates server behavior with versioning and conflict detection
 */
export class MockStorageAdapter implements StorageAPI {
  /**
   * Save estimate data with automatic versioning
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

      // Get current data to determine version
      const existing = await this.load<T>(key);
      const newVersion = existing ? existing.version + 1 : 1;
      
      // Update data with new version and timestamp
      const updatedData: T = {
        ...data,
        version: newVersion,
        updatedAt: new Date().toISOString()
      };

      // Save to localStorage
      const storageKey = getStorageKey(key);
      localStorage.setItem(storageKey, JSON.stringify(updatedData));

      // Update metadata
      const metadata = getMetadata();
      const existingIndex = metadata.findIndex(m => m.id === data.id);
      
      const newMetadata: EstimateMetadata = {
        id: data.id,
        pdfFileName: data.pdfFileName,
        estimateType: data.estimateType,
        version: newVersion,
        updatedAt: updatedData.updatedAt,
        createdAt: data.createdAt
      };

      if (existingIndex >= 0) {
        metadata[existingIndex] = newMetadata;
      } else {
        metadata.push(newMetadata);
      }

      updateMetadata(metadata);

      // Simulate small network delay
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

      console.log(`[MockStorageAdapter] Saved ${key} version ${newVersion}`);

      return {
        success: true,
        version: newVersion
      };

    } catch (error) {
      console.error('[MockStorageAdapter] Save failed:', error);
      
      // Check if it's a quota exceeded error
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        return {
          success: false,
          error: createStorageError('NETWORK_ERROR', 'Storage quota exceeded', false)
        };
      }

      return {
        success: false,
        error: createStorageError('UNKNOWN_ERROR', 'Failed to save data', true)
      };
    }
  }

  /**
   * Load estimate data from localStorage
   */
  async load<T extends EstimateData>(key: EstimateKey): Promise<T | null> {
    try {
      const storageKey = getStorageKey(key);
      const stored = localStorage.getItem(storageKey);
      
      if (!stored) {
        return null;
      }

      const parsed = JSON.parse(stored);
      
      // Validate the loaded data
      if (!isValidEstimateData(parsed)) {
        console.warn('[MockStorageAdapter] Invalid data found, removing:', key);
        localStorage.removeItem(storageKey);
        return null;
      }

      // Simulate small network delay
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));

      return parsed as T;

    } catch (error) {
      console.error('[MockStorageAdapter] Load failed:', error);
      return null;
    }
  }

  /**
   * Delete estimate data and metadata
   */
  async delete(key: EstimateKey): Promise<void> {
    try {
      const storageKey = getStorageKey(key);
      const data = await this.load(key);
      
      if (data) {
        // Remove from localStorage
        localStorage.removeItem(storageKey);

        // Update metadata
        const metadata = getMetadata();
        const filteredMetadata = metadata.filter(m => m.id !== data.id);
        updateMetadata(filteredMetadata);

        console.log(`[MockStorageAdapter] Deleted ${key}`);
      }

      // Simulate small network delay
      await new Promise(resolve => setTimeout(resolve, 50));

    } catch (error) {
      console.error('[MockStorageAdapter] Delete failed:', error);
      throw error;
    }
  }

  /**
   * List all estimate metadata
   */
  async list(): Promise<EstimateMetadata[]> {
    try {
      // Simulate small network delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return getMetadata();
    } catch (error) {
      console.error('[MockStorageAdapter] List failed:', error);
      return [];
    }
  }

  /**
   * Check if estimate exists
   */
  async exists(key: EstimateKey): Promise<boolean> {
    try {
      const storageKey = getStorageKey(key);
      const stored = localStorage.getItem(storageKey);
      return stored !== null;
    } catch (error) {
      console.error('[MockStorageAdapter] Exists check failed:', error);
      return false;
    }
  }

  /**
   * Save with expected version for conflict detection
   */
  async saveWithVersion<T extends EstimateData>(
    key: EstimateKey, 
    data: T, 
    expectedVersion: number
  ): Promise<SaveResult> {
    try {
      // Get current data to check version
      const existing = await this.load<T>(key);
      
      if (existing && existing.version !== expectedVersion) {
        // Version conflict detected
        return {
          success: false,
          error: createStorageError('VERSION_CONFLICT', 'Data was modified by another session', false),
          conflictData: existing
        };
      }

      // No conflict, proceed with normal save
      return this.save(key, data);

    } catch (error) {
      console.error('[MockStorageAdapter] SaveWithVersion failed:', error);
      return {
        success: false,
        error: createStorageError('UNKNOWN_ERROR', 'Failed to save with version check', true)
      };
    }
  }

  /**
   * Clear all mock data (useful for testing)
   */
  async clearAll(): Promise<void> {
    try {
      // Get all auto-save keys
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(STORAGE_PREFIX) || key === METADATA_KEY
      );

      // Remove all auto-save data
      keys.forEach(key => localStorage.removeItem(key));

      console.log('[MockStorageAdapter] Cleared all data');
    } catch (error) {
      console.error('[MockStorageAdapter] Clear all failed:', error);
    }
  }

  /**
   * Simulate network failure for testing
   */
  private simulateNetworkFailure = false;

  enableNetworkFailure(enabled: boolean = true): void {
    this.simulateNetworkFailure = enabled;
  }

  /**
   * Check if network failure simulation is enabled
   */
  private async checkNetworkFailure(): Promise<void> {
    if (this.simulateNetworkFailure) {
      throw new Error('Simulated network failure');
    }
  }
} 