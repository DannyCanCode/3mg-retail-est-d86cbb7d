/**
 * localStorage Migration Utility
 * Phase 4: Clean up redundant localStorage patterns and migrate to auto-save
 */

import { isFeatureEnabled } from './feature-flags';

// Keys that are redundant with auto-save system
const REDUNDANT_ESTIMATE_KEYS = [
  'estimateExtractedPdfData',
  'estimatePdfFileName', 
  'estimateSelectedMaterials',
  'estimateQuantities',
  'estimateLaborRates',
  'estimateProfitMargin',
  'estimateType',
  'estimateSelectedSubtrades',
  'estimateActiveTab',
  'estimatePeelStickCost'
] as const;

// Legacy keys that should be removed
const LEGACY_KEYS = [
  'estimateMeasurements',
  '3mg_stored_measurements'
] as const;

// System keys that should be preserved
const SYSTEM_KEYS = [
  'debug',
  'debug_auto_save',
  'auth_fast_load',
  '__probe'
] as const;

// Auto-save system keys (preserve but manage)
const AUTO_SAVE_KEY_PATTERNS = [
  'auto_save_',
  'emergency_save_',
  'leader_'
] as const;

export interface MigrationResult {
  migratedKeys: string[];
  removedKeys: string[];
  preservedKeys: string[];
  errors: string[];
  totalSizeFreed: number;
}

/**
 * Check if a key should be preserved
 */
function shouldPreserveKey(key: string): boolean {
  // Preserve system keys
  if (SYSTEM_KEYS.includes(key as any)) {
    return true;
  }
  
  // Preserve auto-save system keys
  if (AUTO_SAVE_KEY_PATTERNS.some(pattern => key.startsWith(pattern))) {
    return true;
  }
  
  return false;
}

/**
 * Get size of localStorage item in bytes
 */
function getItemSize(key: string): number {
  try {
    const value = localStorage.getItem(key);
    if (!value) return 0;
    return new Blob([key + value]).size;
  } catch {
    return 0;
  }
}

/**
 * Migrate redundant localStorage keys to auto-save system
 * Only runs if auto-save is enabled and working
 */
export function migrateToAutoSave(): MigrationResult {
  const result: MigrationResult = {
    migratedKeys: [],
    removedKeys: [],
    preservedKeys: [],
    errors: [],
    totalSizeFreed: 0
  };

  try {
    // Only migrate if auto-save is enabled
    if (!isFeatureEnabled('AUTO_SAVE_ENABLED')) {
      console.log('🔄 [MIGRATION] Auto-save disabled, keeping localStorage as fallback');
      return result;
    }

    console.log('🧹 [MIGRATION] Starting localStorage cleanup migration...');

    // Get all localStorage keys
    const allKeys = Object.keys(localStorage);
    
    // Process redundant estimate keys
    REDUNDANT_ESTIMATE_KEYS.forEach(key => {
      if (allKeys.includes(key)) {
        try {
          const size = getItemSize(key);
          
          // Check if auto-save has this data
          const autoSaveKeys = allKeys.filter(k => k.startsWith('auto_save_'));
          const hasAutoSaveData = autoSaveKeys.length > 0;
          
          if (hasAutoSaveData) {
            // Auto-save is working, safe to remove redundant localStorage
            localStorage.removeItem(key);
            result.migratedKeys.push(key);
            result.totalSizeFreed += size;
            console.log(`✅ [MIGRATION] Migrated ${key} to auto-save (freed ${size} bytes)`);
          } else {
            // Auto-save not working yet, preserve as fallback
            result.preservedKeys.push(key);
            console.log(`⏳ [MIGRATION] Preserved ${key} (auto-save not ready)`);
          }
        } catch (error) {
          result.errors.push(`Failed to migrate ${key}: ${error}`);
        }
      }
    });

    // Remove legacy keys
    LEGACY_KEYS.forEach(key => {
      if (allKeys.includes(key)) {
        try {
          const size = getItemSize(key);
          localStorage.removeItem(key);
          result.removedKeys.push(key);
          result.totalSizeFreed += size;
          console.log(`🗑️ [MIGRATION] Removed legacy key ${key} (freed ${size} bytes)`);
        } catch (error) {
          result.errors.push(`Failed to remove ${key}: ${error}`);
        }
      }
    });

    // Clean up orphaned emergency saves older than 24 hours
    const emergencyKeys = allKeys.filter(k => k.startsWith('emergency_save_'));
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    emergencyKeys.forEach(key => {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.timestamp && parsed.timestamp < oneDayAgo) {
            const size = getItemSize(key);
            localStorage.removeItem(key);
            result.removedKeys.push(key);
            result.totalSizeFreed += size;
            console.log(`🗑️ [MIGRATION] Removed old emergency save ${key}`);
          }
        }
      } catch (error) {
        result.errors.push(`Failed to clean emergency save ${key}: ${error}`);
      }
    });

    // Report preserved system keys
    allKeys.forEach(key => {
      if (shouldPreserveKey(key) && !result.preservedKeys.includes(key)) {
        result.preservedKeys.push(key);
      }
    });

    console.log('✅ [MIGRATION] localStorage cleanup completed:', result);
    
    return result;

  } catch (error) {
    result.errors.push(`Migration failed: ${error}`);
    console.error('❌ [MIGRATION] localStorage cleanup failed:', error);
    return result;
  }
}

/**
 * Force clean all estimate localStorage keys (emergency cleanup)
 * Use this only when auto-save is confirmed working
 */
export function forceCleanEstimateKeys(): MigrationResult {
  const result: MigrationResult = {
    migratedKeys: [],
    removedKeys: [],
    preservedKeys: [],
    errors: [],
    totalSizeFreed: 0
  };

  console.log('🧹 [FORCE CLEAN] Removing all estimate localStorage keys...');

  [...REDUNDANT_ESTIMATE_KEYS, ...LEGACY_KEYS].forEach(key => {
    if (localStorage.getItem(key)) {
      try {
        const size = getItemSize(key);
        localStorage.removeItem(key);
        result.removedKeys.push(key);
        result.totalSizeFreed += size;
        console.log(`🗑️ [FORCE CLEAN] Removed ${key} (freed ${size} bytes)`);
      } catch (error) {
        result.errors.push(`Failed to remove ${key}: ${error}`);
      }
    }
  });

  return result;
}

/**
 * Get localStorage usage report
 */
export function getLocalStorageReport(): {
  totalKeys: number;
  redundantKeys: string[];
  legacyKeys: string[];
  systemKeys: string[];
  autoSaveKeys: string[];
  totalSize: number;
  redundantSize: number;
} {
  const allKeys = Object.keys(localStorage);
  
  const redundantKeys = allKeys.filter(key => 
    REDUNDANT_ESTIMATE_KEYS.includes(key as any)
  );
  
  const legacyKeys = allKeys.filter(key => 
    LEGACY_KEYS.includes(key as any)
  );
  
  const systemKeys = allKeys.filter(key => 
    SYSTEM_KEYS.includes(key as any)
  );
  
  const autoSaveKeys = allKeys.filter(key =>
    AUTO_SAVE_KEY_PATTERNS.some(pattern => key.startsWith(pattern))
  );

  const totalSize = allKeys.reduce((sum, key) => sum + getItemSize(key), 0);
  const redundantSize = [...redundantKeys, ...legacyKeys].reduce((sum, key) => sum + getItemSize(key), 0);

  return {
    totalKeys: allKeys.length,
    redundantKeys,
    legacyKeys, 
    systemKeys,
    autoSaveKeys,
    totalSize,
    redundantSize
  };
} 