/**
 * useLocalStorageMigration Hook
 * Manages localStorage cleanup and migration to auto-save system
 */

import { useEffect, useState, useCallback } from 'react';
import { useToast } from './use-toast';
import { 
  migrateToAutoSave, 
  forceCleanEstimateKeys, 
  getLocalStorageReport,
  type MigrationResult 
} from '@/utils/localStorage-migration';

export interface LocalStorageMigrationState {
  isComplete: boolean;
  isInProgress: boolean;
  result: MigrationResult | null;
  report: ReturnType<typeof getLocalStorageReport> | null;
  error: string | null;
}

export interface LocalStorageMigrationActions {
  startMigration: () => Promise<void>;
  forceClean: () => Promise<void>;
  generateReport: () => void;
  reset: () => void;
}

export function useLocalStorageMigration(): LocalStorageMigrationState & LocalStorageMigrationActions {
  const { toast } = useToast();
  
  const [state, setState] = useState<LocalStorageMigrationState>({
    isComplete: false,
    isInProgress: false,
    result: null,
    report: null,
    error: null
  });

  /**
   * Generate localStorage usage report
   */
  const generateReport = useCallback(() => {
    try {
      const report = getLocalStorageReport();
      setState(prev => ({ ...prev, report, error: null }));
      
      console.log('📊 [MIGRATION] localStorage Report:', report);
      
      if (report.redundantKeys.length > 0 || report.legacyKeys.length > 0) {
        console.log(`🧹 [MIGRATION] Found ${report.redundantKeys.length + report.legacyKeys.length} keys that can be cleaned up`);
        console.log(`💾 [MIGRATION] Potential space savings: ${Math.round(report.redundantSize / 1024)}KB`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate report';
      setState(prev => ({ ...prev, error: errorMessage }));
      console.error('❌ [MIGRATION] Report generation failed:', error);
    }
  }, []);

  /**
   * Start gradual migration to auto-save
   */
  const startMigration = useCallback(async () => {
    setState(prev => ({ ...prev, isInProgress: true, error: null }));
    
    try {
      console.log('🚀 [MIGRATION] Starting localStorage migration...');
      
      // Generate pre-migration report
      const preReport = getLocalStorageReport();
      console.log('📊 [MIGRATION] Pre-migration state:', preReport);
      
      // Perform migration
      const result = migrateToAutoSave();
      
      // Generate post-migration report
      const postReport = getLocalStorageReport();
      
      setState(prev => ({
        ...prev,
        isInProgress: false,
        isComplete: true,
        result,
        report: postReport
      }));

      // Show user feedback
      if (result.migratedKeys.length > 0 || result.removedKeys.length > 0) {
        const totalCleaned = result.migratedKeys.length + result.removedKeys.length;
        const spaceSaved = Math.round(result.totalSizeFreed / 1024);
        
        toast({
          title: '🧹 Storage Optimized',
          description: `Cleaned up ${totalCleaned} localStorage items, freed ${spaceSaved}KB`,
          duration: 5000
        });
        
        console.log(`✅ [MIGRATION] Successfully migrated ${result.migratedKeys.length} keys and removed ${result.removedKeys.length} legacy keys`);
      } else {
        console.log('✅ [MIGRATION] No cleanup needed - localStorage already optimized');
      }

      if (result.errors.length > 0) {
        console.warn('⚠️ [MIGRATION] Some errors occurred:', result.errors);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Migration failed';
      setState(prev => ({
        ...prev,
        isInProgress: false,
        error: errorMessage
      }));
      
      toast({
        title: 'Migration Error',
        description: 'localStorage cleanup encountered issues. Check console for details.',
        variant: 'destructive'
      });
      
      console.error('❌ [MIGRATION] Migration failed:', error);
    }
  }, [toast]);

  /**
   * Force clean all estimate keys (emergency cleanup)
   */
  const forceClean = useCallback(async () => {
    setState(prev => ({ ...prev, isInProgress: true, error: null }));
    
    try {
      console.log('🚨 [FORCE CLEAN] Starting emergency cleanup...');
      
      const result = forceCleanEstimateKeys();
      const postReport = getLocalStorageReport();
      
      setState(prev => ({
        ...prev,
        isInProgress: false,
        isComplete: true,
        result,
        report: postReport
      }));

      const spaceSaved = Math.round(result.totalSizeFreed / 1024);
      
      toast({
        title: '🧹 Emergency Cleanup Complete',
        description: `Removed ${result.removedKeys.length} items, freed ${spaceSaved}KB`,
        duration: 5000
      });
      
      console.log(`✅ [FORCE CLEAN] Removed ${result.removedKeys.length} localStorage keys`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Force clean failed';
      setState(prev => ({
        ...prev,
        isInProgress: false,
        error: errorMessage
      }));
      
      toast({
        title: 'Cleanup Error',
        description: 'Emergency cleanup failed. Check console for details.',
        variant: 'destructive'
      });
      
      console.error('❌ [FORCE CLEAN] Failed:', error);
    }
  }, [toast]);

  /**
   * Reset migration state
   */
  const reset = useCallback(() => {
    setState({
      isComplete: false,
      isInProgress: false,
      result: null,
      report: null,
      error: null
    });
  }, []);

  /**
   * Auto-generate report on mount
   */
  useEffect(() => {
    generateReport();
  }, [generateReport]);

  return {
    ...state,
    startMigration,
    forceClean,
    generateReport,
    reset
  };
} 