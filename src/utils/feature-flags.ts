/**
 * Feature Flag Utilities
 * Centralized feature flag management with environment variable support
 */

export interface FeatureFlags {
  AUTO_SAVE_ENABLED: boolean;
  AUTO_SAVE_SUPABASE_ENABLED: boolean;
  AUTO_SAVE_ADMIN_ONLY: boolean;
  AUTO_SAVE_MANAGER_ENABLED: boolean;
  AUTO_SAVE_REP_ENABLED: boolean;
  OFFLINE_QUEUE_ENABLED: boolean;
  CONFLICT_RESOLUTION_ENABLED: boolean;
  ANALYTICS_ENABLED: boolean;
  DEBUG_MODE: boolean;
}

/**
 * Get boolean value from environment variable with default fallback
 */
function getEnvBoolean(key: string, defaultValue: boolean = false): boolean {
  const value = import.meta.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value.toLowerCase() === 'true';
}

/**
 * Get all feature flags from environment with defaults
 */
export function getFeatureFlags(): FeatureFlags {
  return {
    // 🚨 EMERGENCY FIX: Disable auto-save to fix navigation bug when viewing finalized estimates
    AUTO_SAVE_ENABLED: getEnvBoolean('VITE_ENABLE_AUTO_SAVE', false), // ← Disabled to fix navigation bug
    AUTO_SAVE_SUPABASE_ENABLED: getEnvBoolean('VITE_ENABLE_SUPABASE_STORAGE', false),
    
    // 🎯 GRADUAL ROLLOUT: Role-based auto-save activation
    AUTO_SAVE_ADMIN_ONLY: getEnvBoolean('VITE_AUTO_SAVE_ADMIN_ONLY', true), // Start with admin-only
    AUTO_SAVE_MANAGER_ENABLED: getEnvBoolean('VITE_AUTO_SAVE_MANAGER_ENABLED', false), // Enable later
    AUTO_SAVE_REP_ENABLED: getEnvBoolean('VITE_AUTO_SAVE_REP_ENABLED', false), // Enable last
    
    OFFLINE_QUEUE_ENABLED: getEnvBoolean('VITE_ENABLE_OFFLINE_QUEUE', false),
    CONFLICT_RESOLUTION_ENABLED: getEnvBoolean('VITE_ENABLE_CONFLICT_RESOLUTION', false),
    ANALYTICS_ENABLED: getEnvBoolean('VITE_ENABLE_ANALYTICS', false),
    DEBUG_MODE: getEnvBoolean('VITE_DEBUG_MODE', false),
  };
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  return flags[feature];
}

/**
 * Feature flag wrapper for conditional code execution
 */
export function withFeatureFlag<T>(
  feature: keyof FeatureFlags,
  enabledFn: () => T,
  disabledFn?: () => T
): T | undefined {
  if (isFeatureEnabled(feature)) {
    return enabledFn();
  } else if (disabledFn) {
    return disabledFn();
  }
  return undefined;
}

/**
 * React hook for feature flags (re-evaluates on every render)
 */
export function useFeatureFlag(feature: keyof FeatureFlags): boolean {
  return isFeatureEnabled(feature);
}

/**
 * Component wrapper for conditional rendering based on feature flags
 */
export function FeatureFlag({ 
  feature, 
  children 
}: { 
  feature: keyof FeatureFlags; 
  children: React.ReactNode;
}): React.ReactNode {
  return isFeatureEnabled(feature) ? children : null;
}

/**
 * Log feature flag status (for debugging)
 */
export function logFeatureFlags(): void {
  if (isFeatureEnabled('DEBUG_MODE')) {
    const flags = getFeatureFlags();
    console.group('🏳️ Feature Flags Status');
    Object.entries(flags).forEach(([key, value]) => {
      console.log(`${key}: ${value ? '✅' : '❌'}`);
    });
    console.groupEnd();
  }
}

// Initialize feature flag logging on import (only in development)
if (import.meta.env.DEV) {
  logFeatureFlags();
} 