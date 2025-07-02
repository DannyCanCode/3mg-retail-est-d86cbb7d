/**
 * Debounced Callback Utilities
 * Production-ready debouncing with flush-on-unmount and advanced timing controls
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { 
  DebounceConfig, 
  DebouncedFunction, 
  DEFAULT_DEBOUNCE_CONFIG 
} from '@/types/auto-save';

/**
 * Create a debounced function with full control over timing and cleanup
 */
export function createDebouncedFunction<T extends any[]>(
  func: (...args: T) => void,
  config: DebounceConfig
): DebouncedFunction<T> {
  let timeoutId: NodeJS.Timeout | undefined;
  let maxTimeoutId: NodeJS.Timeout | undefined;
  let lastCallTime: number;
  let lastArgs: T | undefined;
  let lastInvokeTime = 0;

  const invokeFunc = (args: T) => {
    lastInvokeTime = Date.now();
    lastArgs = undefined;
    return func(...args);
  };

  const leadingEdge = (args: T) => {
    // Reset any existing max wait timeout
    if (maxTimeoutId) {
      clearTimeout(maxTimeoutId);
      maxTimeoutId = undefined;
    }
    
    // Invoke the function and set up trailing edge
    lastInvokeTime = Date.now();
    timeoutId = setTimeout(() => trailingEdge(args), config.delayMs);
    
    return config.leading ? invokeFunc(args) : undefined;
  };

  const trailingEdge = (args: T) => {
    timeoutId = undefined;
    
    // Clear max wait timeout if it exists
    if (maxTimeoutId) {
      clearTimeout(maxTimeoutId);
      maxTimeoutId = undefined;
    }
    
    if (config.trailing && lastArgs) {
      return invokeFunc(lastArgs);
    }
    return undefined;
  };

  const timerExpired = () => {
    const timeSinceLastCall = Date.now() - lastCallTime;
    
    if (timeSinceLastCall < config.delayMs && timeSinceLastCall >= 0) {
      // Not enough time has passed, reschedule
      timeoutId = setTimeout(timerExpired, config.delayMs - timeSinceLastCall);
    } else {
      // Time has passed, execute trailing edge
      if (lastArgs) {
        trailingEdge(lastArgs);
      }
    }
  };

  const maxWaitExpired = () => {
    maxTimeoutId = undefined;
    if (lastArgs) {
      // Force execution regardless of debounce state
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
      invokeFunc(lastArgs);
    }
  };

  const debounced = (...args: T): void => {
    const now = Date.now();
    const isInvoking = !timeoutId;
    
    lastCallTime = now;
    lastArgs = args;

    if (isInvoking) {
      return leadingEdge(args);
    }

    // Set up max wait timeout if configured and not already set
    if (config.maxWaitMs && !maxTimeoutId) {
      const timeSinceLastInvoke = now - lastInvokeTime;
      const maxWaitRemaining = config.maxWaitMs - timeSinceLastInvoke;
      
      if (maxWaitRemaining > 0) {
        maxTimeoutId = setTimeout(maxWaitExpired, maxWaitRemaining);
      } else {
        // Max wait time has already passed, invoke immediately
        return maxWaitExpired();
      }
    }

    if (timeoutId === undefined) {
      timeoutId = setTimeout(timerExpired, config.delayMs);
    }
  };

  debounced.flush = (): void => {
    if (timeoutId || maxTimeoutId) {
      // Clear both timeouts
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
      if (maxTimeoutId) {
        clearTimeout(maxTimeoutId);
        maxTimeoutId = undefined;
      }
      
      // Execute immediately if we have pending args
      if (lastArgs) {
        invokeFunc(lastArgs);
      }
    }
  };

  debounced.cancel = (): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
    if (maxTimeoutId) {
      clearTimeout(maxTimeoutId);
      maxTimeoutId = undefined;
    }
    lastArgs = undefined;
  };

  debounced.pending = (): boolean => {
    return timeoutId !== undefined || maxTimeoutId !== undefined;
  };

  return debounced;
}

/**
 * React hook for debounced callback with automatic cleanup
 */
export function useDebouncedCallback<T extends any[]>(
  func: (...args: T) => void,
  config: Partial<DebounceConfig> = {}
): DebouncedFunction<T> {
  const fullConfig = { ...DEFAULT_DEBOUNCE_CONFIG, ...config };
  
  // Use ref to store the latest function to avoid stale closures
  const funcRef = useRef(func);
  const debouncedRef = useRef<DebouncedFunction<T> | null>(null);
  
  // Update the function reference whenever it changes
  funcRef.current = func;

  // Create the debounced function
  const debouncedFunction = useCallback(() => {
    if (!debouncedRef.current) {
      debouncedRef.current = createDebouncedFunction(
        (...args: T) => funcRef.current(...args),
        fullConfig
      );
    }
    return debouncedRef.current;
  }, [fullConfig]);

  // Get the current debounced function
  const debounced = debouncedFunction();

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (debouncedRef.current) {
        if (fullConfig.flushOnUnmount) {
          // Execute any pending calls before cleanup
          debouncedRef.current.flush();
        } else {
          // Cancel pending calls
          debouncedRef.current.cancel();
        }
      }
    };
  }, [fullConfig.flushOnUnmount]);

  // Update debounced function when config changes
  useEffect(() => {
    if (debouncedRef.current) {
      // Cancel the old debounced function
      debouncedRef.current.cancel();
      
      // Create a new one with updated config
      debouncedRef.current = createDebouncedFunction(
        (...args: T) => funcRef.current(...args),
        fullConfig
      );
    }
  }, [fullConfig]);

  return debounced;
}

/**
 * React hook for debounced value (similar to useDebounce but for values)
 */
export function useDebouncedValue<T>(
  value: T,
  delayMs: number = 1000
): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);
  
  const updateDebouncedValue = useDebouncedCallback(
    (newValue: T) => setDebouncedValue(newValue),
    { delayMs, flushOnUnmount: true }
  );

  useEffect(() => {
    updateDebouncedValue(value);
  }, [value, updateDebouncedValue]);

  return debouncedValue;
}

/**
 * Utility function to check if two values are deeply equal (for debouncing objects)
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  if (a == null || b == null) return false;
  
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  
  return true;
}

/**
 * React hook for debounced callback that only triggers when the value actually changes
 */
export function useDebouncedChangeCallback<T>(
  value: T,
  callback: (value: T) => void,
  config: Partial<DebounceConfig> = {},
  compare: (a: T, b: T) => boolean = Object.is
): void {
  const previousValue = useRef<T>(value);
  
  const debouncedCallback = useDebouncedCallback(
    (newValue: T) => {
      if (!compare(previousValue.current, newValue)) {
        previousValue.current = newValue;
        callback(newValue);
      }
    },
    config
  );

  useEffect(() => {
    debouncedCallback(value);
  }, [value, debouncedCallback]);
} 