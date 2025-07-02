/**
 * Storage API Interfaces for Auto-Save System
 * Defines strongly-typed contracts for estimate storage
 */

import { Material } from '@/components/estimates/materials/types';
import { LaborRates } from '@/components/estimates/pricing/LaborProfitTab';
import { ParsedMeasurements } from '@/api/measurements';

// ============================================================================
// CORE DATA TYPES
// ============================================================================

/**
 * Complete estimate data structure for storage
 */
export interface EstimateData {
  id: string;
  extractedPdfData: ParsedMeasurements | null;
  pdfFileName: string;
  selectedMaterials: Record<string, Material>;
  quantities: Record<string, number>;
  laborRates: LaborRates;
  profitMargin: number;
  estimateType: 'roof_only' | 'with_subtrades' | null;
  selectedSubtrades: string[];
  activeTab: string;
  peelStickCost: string;
  version: number; // For optimistic locking
  updatedAt: string; // ISO timestamp
  createdAt: string; // ISO timestamp
}

/**
 * Lightweight estimate metadata for listings
 */
export interface EstimateMetadata {
  id: string;
  pdfFileName: string;
  estimateType: 'roof_only' | 'with_subtrades' | null;
  version: number;
  updatedAt: string;
  createdAt: string;
}

// ============================================================================
// STORAGE KEY PATTERNS (Strongly Typed)
// ============================================================================

export type EstimateKey = `estimate:${string}`;
export type MeasurementKey = `measurement:${string}`;
export type TemplateKey = `template:${string}`;

export type StorageKey = EstimateKey | MeasurementKey | TemplateKey;

// ============================================================================
// STORAGE API CONTRACT
// ============================================================================

/**
 * Storage API for estimates with type safety and versioning
 */
export interface StorageAPI {
  // Core operations
  save<T extends EstimateData>(key: EstimateKey, data: T): Promise<SaveResult>;
  load<T extends EstimateData>(key: EstimateKey): Promise<T | null>;
  delete(key: EstimateKey): Promise<void>;
  
  // Listing and metadata
  list(): Promise<EstimateMetadata[]>;
  exists(key: EstimateKey): Promise<boolean>;
  
  // Version control
  saveWithVersion<T extends EstimateData>(
    key: EstimateKey, 
    data: T, 
    expectedVersion: number
  ): Promise<SaveResult>;
}

/**
 * Result of save operations with error handling
 */
export interface SaveResult {
  success: boolean;
  version?: number;
  error?: StorageError;
  conflictData?: EstimateData; // For version conflicts
}

/**
 * Storage operation errors
 */
export interface StorageError {
  code: 'NETWORK_ERROR' | 'VERSION_CONFLICT' | 'VALIDATION_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  retryable: boolean;
}

// ============================================================================
// CONFLICT RESOLUTION
// ============================================================================

/**
 * Data for conflict resolution UI
 */
export interface ConflictData {
  serverData: EstimateData;
  localData: EstimateData;
  conflictedFields: string[];
}

/**
 * User's conflict resolution choice
 */
export type ConflictResolution = 'use_server' | 'use_local' | 'manual_merge';

// ============================================================================
// OFFLINE QUEUE
// ============================================================================

/**
 * Queued operation for offline sync
 */
export interface OfflineQueueItem {
  id: string;
  operation: 'save' | 'delete';
  key: EstimateKey;
  data?: EstimateData;
  timestamp: number;
  retryCount: number;
  nextRetry: number;
  lastError?: string;
  status: 'pending' | 'processing' | 'failed_permanently';
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Auto-save status for UI indicators
 */
export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

/**
 * Network connectivity status
 */
export interface NetworkStatus {
  isOnline: boolean;
  effectiveType?: string; // 'slow-2g' | '2g' | '3g' | '4g'
  downlink?: number;
  rtt?: number;
}

/**
 * Feature flag configuration
 */
export interface FeatureFlags {
  AUTO_SAVE_ENABLED: boolean;
  OFFLINE_QUEUE_ENABLED: boolean;
  CONFLICT_RESOLUTION_ENABLED: boolean;
  ANALYTICS_ENABLED: boolean;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for EstimateKey
 */
export function isEstimateKey(key: string): key is EstimateKey {
  return key.startsWith('estimate:');
}

/**
 * Type guard for valid EstimateData
 */
export function isValidEstimateData(data: any): data is EstimateData {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.id === 'string' &&
    typeof data.version === 'number' &&
    typeof data.updatedAt === 'string' &&
    typeof data.createdAt === 'string'
  );
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/**
 * Create a new EstimateData with default values
 */
export function createDefaultEstimateData(id: string): EstimateData {
  const now = new Date().toISOString();
  
  return {
    id,
    extractedPdfData: null,
    pdfFileName: '',
    selectedMaterials: {},
    quantities: {},
    laborRates: {
      laborRate: 85,
      tearOff: 0,
      installation: 0,
      isHandload: false,
      handloadRate: 10,
      dumpsterLocation: "orlando",
      dumpsterCount: 1,
      dumpsterRate: 400,
      includePermits: true,
      permitRate: 450,
      permitCount: 1,
      permitAdditionalRate: 450,
      pitchRates: {},
      wastePercentage: 12,
      includeGutters: false,
      gutterLinearFeet: 0,
      gutterRate: 8,
      includeDownspouts: false,
      downspoutCount: 0,
      downspoutRate: 75,
      includeDetachResetGutters: false,
      detachResetGutterLinearFeet: 0,
      detachResetGutterRate: 1,
      includeSkylights2x2: false,
      skylights2x2Count: 0,
      skylights2x2Rate: 280,
      includeSkylights2x4: false,
      skylights2x4Count: 0,
      skylights2x4Rate: 370,
      includeLowSlopeLabor: true,
      includeSteepSlopeLabor: true
    },
    profitMargin: 25,
    estimateType: null,
    selectedSubtrades: [],
    activeTab: 'type-selection',
    peelStickCost: '0.00',
    version: 1,
    updatedAt: now,
    createdAt: now
  };
} 