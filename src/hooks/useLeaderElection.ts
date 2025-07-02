/**
 * Leader Election Hook
 * Manages cross-tab leadership for auto-save coordination
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  LeaderRecord, 
  LeaderStatus, 
  LeaderElectionConfig, 
  DEFAULT_LEADER_CONFIG,
  isValidLeaderRecord
} from '@/types/auto-save';
import { isFeatureEnabled } from '@/utils/feature-flags';

/**
 * Generate unique tab ID with timestamp and random component
 */
function generateTabId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const userAgent = navigator.userAgent.slice(-8); // Last 8 chars for uniqueness
  return `tab-${timestamp}-${random}-${userAgent}`;
}

/**
 * Add random jitter to prevent collision between tabs
 */
function addJitter(baseMs: number, maxJitterMs: number): number {
  const jitter = Math.random() * maxJitterMs;
  return baseMs + jitter;
}

/**
 * Hook for cross-tab leader election with crash detection
 */
export function useLeaderElection(
  storageKey: string,
  config: Partial<LeaderElectionConfig> = {}
): {
  isLeader: boolean;
  status: LeaderStatus;
  tabId: string;
  claimLeadership: () => void;
  releaseLeadership: () => void;
} {
  // If auto-save is disabled, this tab is always the leader
  if (!isFeatureEnabled('AUTO_SAVE_ENABLED')) {
    const tabId = useRef(generateTabId()).current;
    return {
      isLeader: true,
      status: 'leader',
      tabId,
      claimLeadership: () => {},
      releaseLeadership: () => {}
    };
  }

  const fullConfig = { ...DEFAULT_LEADER_CONFIG, ...config };
  const tabId = useRef(generateTabId()).current;
  const [isLeader, setIsLeader] = useState(false);
  const [status, setStatus] = useState<LeaderStatus>('claiming');
  
  // Refs for cleanup
  const heartbeatInterval = useRef<NodeJS.Timeout>();
  const claimTimeout = useRef<NodeJS.Timeout>();
  const attemptCount = useRef(0);
  const isMounted = useRef(true);

  /**
   * Check if a leader record is stale (beyond TTL)
   */
  const isStaleRecord = useCallback((record: LeaderRecord): boolean => {
    const now = Date.now();
    const timeSinceHeartbeat = now - record.heartbeat;
    return timeSinceHeartbeat > fullConfig.leaseTimeoutMs;
  }, [fullConfig.leaseTimeoutMs]);

  /**
   * Get current leader record from localStorage
   */
  const getCurrentLeader = useCallback((): LeaderRecord | null => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return null;
      
      const parsed = JSON.parse(stored);
      if (!isValidLeaderRecord(parsed)) {
        // Invalid record, remove it
        localStorage.removeItem(storageKey);
        return null;
      }
      
      return parsed;
    } catch (error) {
      console.warn('[useLeaderElection] Failed to parse leader record:', error);
      localStorage.removeItem(storageKey);
      return null;
    }
  }, [storageKey]);

  /**
   * Update heartbeat for current leader
   */
  const updateHeartbeat = useCallback(() => {
    if (!isLeader || !isMounted.current) return;
    
    try {
      const current = getCurrentLeader();
      if (current && current.tabId === tabId) {
        const updated: LeaderRecord = {
          ...current,
          heartbeat: Date.now()
        };
        localStorage.setItem(storageKey, JSON.stringify(updated));
      }
    } catch (error) {
      console.warn('[useLeaderElection] Failed to update heartbeat:', error);
    }
  }, [isLeader, getCurrentLeader, storageKey, tabId]);

  /**
   * Attempt to claim leadership
   */
  const claimLeadership = useCallback(() => {
    if (!isMounted.current) return;
    
    const current = getCurrentLeader();
    
    // Check if someone else is already leader and not stale
    if (current && current.tabId !== tabId && !isStaleRecord(current)) {
      setStatus('follower');
      setIsLeader(false);
      return;
    }
    
    // Attempt to claim leadership
    try {
      const leaderRecord: LeaderRecord = {
        tabId,
        timestamp: Date.now(),
        heartbeat: Date.now()
      };
      
      localStorage.setItem(storageKey, JSON.stringify(leaderRecord));
      
      // Give other tabs a moment to contest leadership
      const jitteredDelay = addJitter(200, fullConfig.jitterMaxMs);
      claimTimeout.current = setTimeout(() => {
        if (!isMounted.current) return;
        
        // Check if we're still the leader after jitter delay
        const final = getCurrentLeader();
        if (final && final.tabId === tabId) {
          setIsLeader(true);
          setStatus('leader');
          attemptCount.current = 0;
          
          // Start heartbeat
          if (heartbeatInterval.current) {
            clearInterval(heartbeatInterval.current);
          }
          
          heartbeatInterval.current = setInterval(() => {
            updateHeartbeat();
          }, fullConfig.heartbeatIntervalMs);
          
          console.log(`[useLeaderElection] Tab ${tabId} claimed leadership for ${storageKey}`);
        } else {
          // Someone else claimed leadership
          setIsLeader(false);
          setStatus('follower');
        }
      }, jitteredDelay);
      
    } catch (error) {
      console.warn('[useLeaderElection] Failed to claim leadership:', error);
      setStatus('follower');
      setIsLeader(false);
    }
  }, [getCurrentLeader, storageKey, tabId, isStaleRecord, fullConfig, updateHeartbeat]);

  /**
   * Release leadership
   */
  const releaseLeadership = useCallback(() => {
    if (!isLeader) return;
    
    try {
      const current = getCurrentLeader();
      if (current && current.tabId === tabId) {
        localStorage.removeItem(storageKey);
        console.log(`[useLeaderElection] Tab ${tabId} released leadership for ${storageKey}`);
      }
    } catch (error) {
      console.warn('[useLeaderElection] Failed to release leadership:', error);
    }
    
    setIsLeader(false);
    setStatus('follower');
    
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = undefined;
    }
  }, [isLeader, getCurrentLeader, storageKey, tabId]);

  /**
   * Handle storage events (detect crashes and changes from other tabs)
   */
  const handleStorageEvent = useCallback((event: StorageEvent) => {
    if (event.key !== storageKey || !isMounted.current) return;
    
    const current = getCurrentLeader();
    
    if (!current) {
      // Leader record was removed, try to claim leadership
      if (!isLeader && attemptCount.current < fullConfig.maxClaimAttempts) {
        attemptCount.current++;
        setStatus('claiming');
        
        // Add jitter before claiming to reduce conflicts
        const jitteredDelay = addJitter(500, fullConfig.jitterMaxMs);
        setTimeout(() => {
          if (isMounted.current) {
            claimLeadership();
          }
        }, jitteredDelay);
      }
    } else if (current.tabId === tabId) {
      // We are/became the leader
      if (!isLeader) {
        setIsLeader(true);
        setStatus('leader');
      }
    } else if (isStaleRecord(current)) {
      // Current leader is stale, try to claim
      if (!isLeader && attemptCount.current < fullConfig.maxClaimAttempts) {
        attemptCount.current++;
        setStatus('claiming');
        claimLeadership();
      }
    } else {
      // Another tab is the active leader
      if (isLeader) {
        releaseLeadership();
      } else {
        setStatus('follower');
      }
    }
  }, [storageKey, getCurrentLeader, isLeader, isStaleRecord, fullConfig, claimLeadership, releaseLeadership]);

  /**
   * Periodic check for stale leaders
   */
  const checkForStaleLeaders = useCallback(() => {
    if (!isMounted.current) return;
    
    const current = getCurrentLeader();
    
    if (current && isStaleRecord(current) && !isLeader) {
      console.log(`[useLeaderElection] Detected stale leader ${current.tabId}, attempting to claim`);
      if (attemptCount.current < fullConfig.maxClaimAttempts) {
        attemptCount.current++;
        setStatus('claiming');
        claimLeadership();
      }
    }
  }, [getCurrentLeader, isStaleRecord, isLeader, fullConfig, claimLeadership]);

  /**
   * Initialize leadership on mount
   */
  useEffect(() => {
    isMounted.current = true;
    attemptCount.current = 0;
    
    // Check current state and try to claim leadership
    const current = getCurrentLeader();
    if (!current || isStaleRecord(current)) {
      claimLeadership();
    } else {
      setStatus('follower');
      setIsLeader(false);
    }

    // Set up storage event listener for cross-tab communication
    window.addEventListener('storage', handleStorageEvent);
    
    // Set up periodic stale leader detection
    const staleCheckInterval = setInterval(checkForStaleLeaders, fullConfig.heartbeatIntervalMs * 2);
    
    return () => {
      isMounted.current = false;
      
      // Clear timeouts and intervals
      if (claimTimeout.current) {
        clearTimeout(claimTimeout.current);
      }
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      clearInterval(staleCheckInterval);
      
      // Remove event listener
      window.removeEventListener('storage', handleStorageEvent);
      
      // Release leadership if we have it
      if (isLeader) {
        try {
          const current = getCurrentLeader();
          if (current && current.tabId === tabId) {
            localStorage.removeItem(storageKey);
          }
        } catch (error) {
          console.warn('[useLeaderElection] Failed to cleanup leadership on unmount:', error);
        }
      }
    };
  }, []);

  /**
   * Cleanup on status changes that require it
   */
  useEffect(() => {
    if (!isLeader && heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = undefined;
    }
  }, [isLeader]);

  return {
    isLeader,
    status,
    tabId,
    claimLeadership,
    releaseLeadership
  };
} 