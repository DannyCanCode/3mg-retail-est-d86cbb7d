/**
 * Auto-Save Core Types
 * Types specifically for the auto-save hook system
 */

import { EstimateData, StorageError } from './storage';

// ============================================================================
// LEADER ELECTION TYPES
// ============================================================================

/**
 * Leader election record stored in localStorage
 */
export interface LeaderRecord {
  tabId: string;
  timestamp: number;
  heartbeat: number;
  estimateId?: string; // Optional estimate context
}

/**
 * Leader election status
 */
export type LeaderStatus = 'claiming' | 'leader' | 'follower' | 'stale';

/**
 * Leader election configuration
 */
export interface LeaderElectionConfig {
  leaseTimeoutMs: number;    // How long a lease is valid (default: 30s)
  heartbeatIntervalMs: number; // How often to heartbeat (default: 5s)
  jitterMaxMs: number;       // Random jitter to prevent collisions (default: 1s)
  maxClaimAttempts: number;  // Max attempts to claim leadership (default: 3)
}

// ============================================================================
// DEBOUNCED CALLBACK TYPES
// ============================================================================

/**
 * Debounced callback configuration
 */
export interface DebounceConfig {
  delayMs: number;           // Debounce delay (default: 10s)
  maxWaitMs?: number;        // Max time to wait before forcing execution (default: 60s)
  flushOnUnmount: boolean;   // Execute immediately on component unmount (default: true)
  leading?: boolean;         // Execute on leading edge (default: false)
  trailing?: boolean;        // Execute on trailing edge (default: true)
}

/**
 * Debounced function interface
 */
export interface DebouncedFunction<T extends any[]> {
  (...args: T): void;
  flush: () => void;         // Force immediate execution
  cancel: () => void;        // Cancel pending execution
  pending: () => boolean;    // Check if execution is pending
}

// ============================================================================
// AUTO-SAVE HOOK TYPES
// ============================================================================

/**
 * Auto-save hook configuration
 */
export interface AutoSaveConfig {
  estimateId: string;
  debounceMs?: number;       // Auto-save debounce delay (default: 10s)
  maxDeferralMs?: number;    // Force save after this time (default: 60s)
  enableOfflineQueue?: boolean; // Queue saves when offline (default: true)
  enableConflictResolution?: boolean; // Handle version conflicts (default: true)
  validateBeforeSave?: (data: EstimateData) => boolean; // Data validation
}

/**
 * Auto-save hook return value
 */
export interface AutoSaveHook {
  // Current state
  status: AutoSaveStatus;
  lastSaved: string | null;  // ISO timestamp of last successful save
  isDirty: boolean;         // Has unsaved changes
  isLeader: boolean;        // Is this tab the leader for this estimate
  
  // Actions
  save: (data: EstimateData) => Promise<void>;
  flush: () => Promise<void>; // Force immediate save
  markClean: () => void;    // Mark as saved without actually saving
  
  // Status indicators
  error: StorageError | null;
  conflictData: ConflictData | null;
}

/**
 * Auto-save status (from storage.ts but re-exported for convenience)
 */
export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

/**
 * Conflict data for resolution UI
 */
export interface ConflictData {
  serverData: EstimateData;
  localData: EstimateData;
  conflictedFields: string[];
  serverVersion: number;
  localVersion: number;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Data validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Validation warning (non-blocking)
 */
export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Auto-save events for analytics/monitoring
 */
export type AutoSaveEvent = 
  | { type: 'save_started'; estimateId: string; dataSize: number }
  | { type: 'save_completed'; estimateId: string; duration: number }
  | { type: 'save_failed'; estimateId: string; error: StorageError }
  | { type: 'conflict_detected'; estimateId: string; conflictData: ConflictData }
  | { type: 'leader_elected'; estimateId: string; tabId: string }
  | { type: 'leader_lost'; estimateId: string; tabId: string }
  | { type: 'offline_queued'; estimateId: string; queueLength: number }
  | { type: 'validation_failed'; estimateId: string; errors: ValidationError[] };

/**
 * Event handler function
 */
export type AutoSaveEventHandler = (event: AutoSaveEvent) => void;

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Tab identification
 */
export interface TabInfo {
  id: string;
  timestamp: number;
  userAgent: string;
  estimateId?: string;
}

/**
 * Performance metrics for monitoring
 */
export interface SaveMetrics {
  saveCount: number;
  totalSaveTime: number;
  averageSaveTime: number;
  lastSaveTime: number;
  errorCount: number;
  conflictCount: number;
}

/**
 * Network quality information
 */
export interface NetworkQuality {
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g';
  downlink: number;       // Mbps
  rtt: number;           // Round trip time in ms
  saveData: boolean;     // User has save-data preference
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for LeaderRecord
 */
export function isValidLeaderRecord(data: any): data is LeaderRecord {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.tabId === 'string' &&
    typeof data.timestamp === 'number' &&
    typeof data.heartbeat === 'number'
  );
}

/**
 * Type guard for AutoSaveEvent
 */
export function isAutoSaveEvent(data: any): data is AutoSaveEvent {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.type === 'string' &&
    ['save_started', 'save_completed', 'save_failed', 'conflict_detected', 
     'leader_elected', 'leader_lost', 'offline_queued', 'validation_failed'].includes(data.type)
  );
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default configurations
 */
export const DEFAULT_LEADER_CONFIG: LeaderElectionConfig = {
  leaseTimeoutMs: 30000,     // 30 seconds
  heartbeatIntervalMs: 5000, // 5 seconds  
  jitterMaxMs: 1000,         // 1 second
  maxClaimAttempts: 3        // 3 attempts
};

export const DEFAULT_DEBOUNCE_CONFIG: DebounceConfig = {
  delayMs: 10000,           // 10 seconds
  maxWaitMs: 60000,         // 60 seconds
  flushOnUnmount: true,     // Always flush on unmount
  leading: false,           // Don't execute immediately
  trailing: true            // Execute after delay
};

export const DEFAULT_AUTO_SAVE_CONFIG: Partial<AutoSaveConfig> = {
  debounceMs: 10000,               // 10 seconds
  maxDeferralMs: 60000,            // 60 seconds
  enableOfflineQueue: true,        // Enable offline support
  enableConflictResolution: true   // Enable conflict resolution
}; 