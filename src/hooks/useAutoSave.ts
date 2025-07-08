/**
 * Auto-Save Hook
 * Main hook for automatic estimate saving with leader election and debouncing
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLeaderElection } from './useLeaderElection';
import { useDebouncedCallback } from '@/utils/debounce';
import { MockStorageAdapter } from '@/adapters/MockStorageAdapter';
import { SupabaseStorageAdapter } from '@/adapters/SupabaseStorageAdapter';
import { isFeatureEnabled } from '@/utils/feature-flags';
import {
  EstimateData,
  EstimateKey,
  StorageError,
  createDefaultEstimateData
} from '@/types/storage';
import {
  AutoSaveHook,
  AutoSaveConfig,
  AutoSaveStatus,
  ConflictData,
  DEFAULT_AUTO_SAVE_CONFIG
} from '@/types/auto-save';

/**
 * Generate UUID for estimates
 */
function generateEstimateId(): string {
  return crypto.randomUUID();
}

/**
 * Create estimate storage key
 */
function createEstimateKey(estimateId: string): EstimateKey {
  return `estimate:${estimateId}`;
}

/**
 * Calculate data size for monitoring
 */
function getDataSize(data: EstimateData): number {
  try {
    return new Blob([JSON.stringify(data)]).size;
  } catch {
    return 0;
  }
}

/**
 * Send emergency save using navigator.sendBeacon
 */
function sendEmergencySave(data: EstimateData): boolean {
  try {
    const payload = JSON.stringify({
      type: 'emergency_save',
      estimateId: data.id,
      data,
      timestamp: Date.now()
    });

    // Create a blob for sendBeacon
    const blob = new Blob([payload], { type: 'application/json' });
    
    // In production, this would send to a real endpoint
    // For now, we'll store in a special localStorage key for emergency recovery
    const emergencyKey = `emergency_save_${data.id}_${Date.now()}`;
    localStorage.setItem(emergencyKey, payload);
    
    console.log(`[useAutoSave] Emergency save stored: ${emergencyKey}`);
    return true;
  } catch (error) {
    console.error('[useAutoSave] Emergency save failed:', error);
    return false;
  }
}

/**
 * Create storage adapter based on feature flags
 */
function createStorageAdapter() {
  // Use Supabase in production, Mock for development/testing
  const useSupabase = isFeatureEnabled('AUTO_SAVE_SUPABASE_ENABLED') || 
                     import.meta.env.PROD ||
                     import.meta.env.VITE_USE_SUPABASE_STORAGE === 'true';
  
  if (useSupabase) {
    console.log('[useAutoSave] Using SupabaseStorageAdapter for production storage');
    return new SupabaseStorageAdapter();
  } else {
    console.log('[useAutoSave] Using MockStorageAdapter for development/testing');
    return new MockStorageAdapter();
  }
}

/**
 * Default storage adapter instance
 */
const defaultStorageAdapter = createStorageAdapter();

/**
 * Main auto-save hook for estimates
 */
export function useAutoSave(
  estimateId: string | null = null,
  data: Partial<EstimateData> | null = null,
  config: Partial<AutoSaveConfig> = {}
): AutoSaveHook {
  // If auto-save is disabled, return a no-op hook
  if (!isFeatureEnabled('AUTO_SAVE_ENABLED')) {
    return {
      status: 'idle',
      lastSaved: null,
      isDirty: false,
      isLeader: false,
      hydratedData: null,
      isHydrating: false,
      save: async () => {},
      flush: async () => {},
      markClean: () => {},
      error: null,
      conflictData: null
    };
  }

  const fullConfig = { ...DEFAULT_AUTO_SAVE_CONFIG, ...config };
  
  // Generate estimate ID if not provided
  const finalEstimateId = estimateId || generateEstimateId();
  const estimateKey = createEstimateKey(finalEstimateId);
  
  // State management
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<StorageError | null>(null);
  const [conflictData, setConflictData] = useState<ConflictData | null>(null);
  
  // Refs for data management
  const currentData = useRef<EstimateData | null>(null);
  const lastSavedData = useRef<EstimateData | null>(null);
  const saveInProgress = useRef(false);
  const mounted = useRef(true);
  
  // State for hydrated data from storage
  const [hydratedData, setHydratedData] = useState<EstimateData | null>(null);
  const [isHydrating, setIsHydrating] = useState(false);

  // Leader election for this estimate
  const { isLeader, status: leaderStatus } = useLeaderElection(
    `leader_${finalEstimateId}`,
    {
      leaseTimeoutMs: 30000,
      heartbeatIntervalMs: 5000,
      jitterMaxMs: 1000,
      maxClaimAttempts: 3
    }
  );

  // Storage adapter
  const storageAdapter = defaultStorageAdapter;

  /**
   * Update current data and mark as dirty if changed
   */
  const updateCurrentData = useCallback((newData: Partial<EstimateData>) => {
    if (!newData || !finalEstimateId) return;

    // Create complete EstimateData object
    const completeData: EstimateData = {
      ...createDefaultEstimateData(finalEstimateId),
      ...newData,
      id: finalEstimateId,
      updatedAt: new Date().toISOString()
    };

    // Check if data actually changed
    const hasChanged = JSON.stringify(completeData) !== JSON.stringify(currentData.current);
    
    if (hasChanged) {
      currentData.current = completeData;
      setIsDirty(true);
      setError(null); // Clear previous errors on new data
    }
  }, [finalEstimateId]);

  /**
   * Perform the actual save operation
   */
  const performSave = useCallback(async (dataToSave: EstimateData): Promise<void> => {
    if (!isLeader || saveInProgress.current || !mounted.current) {
      if (import.meta.env.DEV || localStorage.getItem('debug_auto_save') === 'true') {
      console.log('[useAutoSave] Save skipped:', { isLeader, saveInProgress: saveInProgress.current, mounted: mounted.current });
      }
      return;
    }

    saveInProgress.current = true;
    setStatus('saving');
    setError(null);

    try {
      const startTime = Date.now();
      const dataSize = getDataSize(dataToSave);

      if (import.meta.env.DEV || localStorage.getItem('debug_auto_save') === 'true') {
      console.log(`[useAutoSave] Starting save for ${finalEstimateId}, size: ${dataSize} bytes`);
      }

      // Validate data if validation function provided
      if (fullConfig.validateBeforeSave && !fullConfig.validateBeforeSave(dataToSave)) {
        throw new Error('Data validation failed');
      }

      // Perform the save
      const result = await storageAdapter.save(estimateKey, dataToSave);

      if (!mounted.current) return;

      if (result.success) {
        const duration = Date.now() - startTime;
        lastSavedData.current = { ...dataToSave, version: result.version || dataToSave.version };
        setLastSaved(new Date().toISOString());
        setStatus('saved');
        setIsDirty(false);
        
        if (import.meta.env.DEV || localStorage.getItem('debug_auto_save') === 'true') {
        console.log(`[useAutoSave] Save completed in ${duration}ms, version: ${result.version}`);
        }
        
        // Set status back to idle after brief success indication
        setTimeout(() => {
          if (mounted.current) {
            setStatus('idle');
          }
        }, 2000);
        
      } else {
        throw new Error(result.error?.message || 'Save failed');
      }

    } catch (error) {
      if (!mounted.current) return;

      console.error('[useAutoSave] Save failed:', error);
      
      const storageError: StorageError = {
        code: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true
      };
      
      setError(storageError);
      setStatus('error');
      
      // Auto-retry for retryable errors
      if (storageError.retryable) {
        setTimeout(() => {
          if (mounted.current && currentData.current) {
            performSave(currentData.current);
          }
        }, 5000);
      }
    } finally {
      saveInProgress.current = false;
    }
  }, [isLeader, finalEstimateId, estimateKey, storageAdapter, fullConfig]);

  /**
   * Debounced save function
   */
  const debouncedSave = useDebouncedCallback(
    (dataToSave: EstimateData) => {
      if (isLeader) {
        performSave(dataToSave);
      }
    },
    {
      delayMs: fullConfig.debounceMs || 10000,
      maxWaitMs: fullConfig.maxDeferralMs || 60000,
      flushOnUnmount: true
    }
  );

  /**
   * Manual save function
   */
  const save = useCallback(async (dataToSave: EstimateData): Promise<void> => {
    updateCurrentData(dataToSave);
    if (currentData.current && isLeader) {
      await performSave(currentData.current);
    }
  }, [updateCurrentData, performSave, isLeader]);

  /**
   * Flush any pending saves immediately
   */
  const flush = useCallback(async (): Promise<void> => {
    if (debouncedSave.pending()) {
      debouncedSave.flush();
    }
    
    // Wait for any in-progress save to complete
    while (saveInProgress.current && mounted.current) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }, [debouncedSave]);

  /**
   * Mark data as clean (saved) without actually saving
   */
  const markClean = useCallback((): void => {
    setIsDirty(false);
    setStatus('saved');
    if (currentData.current) {
      lastSavedData.current = { ...currentData.current };
    }
  }, []);

  /**
   * Auto-save when data changes
   */
  useEffect(() => {
    if (data) {
      updateCurrentData(data);
      
      // Trigger debounced save if we have current data and we're the leader
      if (currentData.current && isLeader && isDirty) {
        debouncedSave(currentData.current);
      }
    }
  }, [data, isLeader, isDirty, updateCurrentData, debouncedSave]);

  /**
   * Emergency save on page unload
   */
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Flush any pending saves immediately
      if (debouncedSave.pending()) {
        debouncedSave.flush();
      }
      
      // If we have unsaved data and we're the leader, attempt emergency save
      if (isDirty && currentData.current && isLeader) {
        const success = sendEmergencySave(currentData.current);
        
        if (success) {
          console.log('[useAutoSave] Emergency save initiated on page unload');
        }
        
        // Show browser warning for unsaved changes
        event.preventDefault();
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return event.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, isLeader, debouncedSave]);

  /**
   * 🔄 HYDRATION: Load existing data on mount and hydrate form state
   */
  useEffect(() => {
    if (finalEstimateId && isLeader && !hydratedData) {
      const loadExistingData = async () => {
        setIsHydrating(true);
        
        try {
          // Only log when debug mode is enabled or in development
          if (import.meta.env.DEV || localStorage.getItem('debug_auto_save') === 'true') {
          console.log(`[useAutoSave] 🔄 HYDRATING: Loading saved data for ${finalEstimateId}`);
          }
          const existingData = await storageAdapter.load(estimateKey);
          
          if (existingData && mounted.current) {
            lastSavedData.current = existingData;
            setHydratedData(existingData); // 🎯 HYDRATE THE FORM STATE
            setLastSaved(existingData.updatedAt);
            console.log(`[useAutoSave] ✅ HYDRATED: Loaded saved data with ${Object.keys(existingData.selectedMaterials || {}).length} materials`);
          } else {
            // Only log no data found in debug mode to reduce console noise
            if (import.meta.env.DEV || localStorage.getItem('debug_auto_save') === 'true') {
            console.log(`[useAutoSave] 🔍 HYDRATION: No existing data found for ${finalEstimateId}`);
            }
          }
        } catch (error) {
          console.error('[useAutoSave] ❌ HYDRATION FAILED:', error);
          setError({
            code: 'HYDRATION_ERROR',
            message: error instanceof Error ? error.message : 'Failed to load saved data',
            retryable: true
          });
        } finally {
          setIsHydrating(false);
        }
      };

      loadExistingData();
    }
  }, [finalEstimateId, isLeader, estimateKey, storageAdapter, hydratedData]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  /**
   * Determine overall status
   */
  const overallStatus = useMemo((): AutoSaveStatus => {
    if (!navigator.onLine) return 'offline';
    return status;
  }, [status]);

  return {
    status: overallStatus,
    lastSaved,
    isDirty,
    isLeader,
    hydratedData,
    isHydrating,
    save,
    flush,
    markClean,
    error,
    conflictData
  };
}

/**
 * Utility hook to generate estimate ID
 */
export function useEstimateId(): string {
  const [estimateId] = useState(() => generateEstimateId());
  return estimateId;
}

/**
 * Utility to recover emergency saves from localStorage
 */
export function getEmergencySaves(): Array<{ key: string; data: any; timestamp: number }> {
  try {
    const emergencyKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('emergency_save_')
    );
    
    return emergencyKeys.map(key => {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          key,
          data: parsed.data,
          timestamp: parsed.timestamp
        };
      }
      return null;
    }).filter(Boolean) as Array<{ key: string; data: any; timestamp: number }>;
  } catch (error) {
    console.error('[useAutoSave] Failed to get emergency saves:', error);
    return [];
  }
}

/**
 * Clear emergency saves after recovery
 */
export function clearEmergencySaves(): void {
  try {
    const emergencyKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('emergency_save_')
    );
    
    emergencyKeys.forEach(key => localStorage.removeItem(key));
    console.log(`[useAutoSave] Cleared ${emergencyKeys.length} emergency saves`);
  } catch (error) {
    console.error('[useAutoSave] Failed to clear emergency saves:', error);
  }
} 