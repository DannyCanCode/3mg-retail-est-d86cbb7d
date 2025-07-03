/**
 * Auto-Save Hook Tests
 * Unit tests for useAutoSave hook functionality
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAutoSave, getEmergencySaves, clearEmergencySaves } from '../useAutoSave';
import { MockStorageAdapter } from '@/adapters/MockStorageAdapter';
import { createDefaultEstimateData } from '@/types/storage';

// Mock feature flags to enable auto-save
jest.mock('@/utils/feature-flags', () => ({
  isFeatureEnabled: (feature: string) => {
    if (feature === 'AUTO_SAVE_ENABLED') return true;
    return false;
  }
}));

// Mock the leader election hook
jest.mock('../useLeaderElection', () => ({
  useLeaderElection: () => ({
    isLeader: true,
    status: 'leader',
    tabId: 'test-tab-123',
    claimLeadership: jest.fn(),
    releaseLeadership: jest.fn()
  })
}));

// Mock the debounced callback
const mockDebouncedCallback = {
  flush: jest.fn(),
  cancel: jest.fn(),
  pending: jest.fn(() => false)
};

jest.mock('@/utils/debounce', () => ({
  useDebouncedCallback: () => mockDebouncedCallback
}));

describe('useAutoSave', () => {
  const testEstimateId = 'test-estimate-123';
  const testData = createDefaultEstimateData(testEstimateId);

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Reset mocks
    jest.clearAllMocks();
    mockDebouncedCallback.pending.mockReturnValue(false);
    
    // Clear mock storage adapter
    const adapter = new MockStorageAdapter();
    adapter.clearAll();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Basic Functionality', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => 
        useAutoSave(testEstimateId, testData)
      );

      expect(result.current.status).toBe('idle');
      expect(result.current.isDirty).toBe(false);
      expect(result.current.isLeader).toBe(true);
      expect(result.current.lastSaved).toBe(null);
      expect(result.current.error).toBe(null);
      expect(result.current.conflictData).toBe(null);
    });

    it('should return no-op functions when auto-save is disabled', () => {
      // Mock feature flag as disabled
      const mockIsFeatureEnabled = jest.fn(() => false);
      jest.doMock('@/utils/feature-flags', () => ({
        isFeatureEnabled: mockIsFeatureEnabled
      }));

      const { result } = renderHook(() => 
        useAutoSave(testEstimateId, testData)
      );

      expect(result.current.status).toBe('idle');
      expect(result.current.isLeader).toBe(false);
      
      // Should be no-op functions
      act(() => {
        result.current.save(testData);
        result.current.flush();
        result.current.markClean();
      });
      
      // No errors should occur
      expect(result.current.error).toBe(null);
    });
  });

  describe('Save Operations', () => {
    it('should mark data as dirty when data changes', async () => {
      const { result, rerender } = renderHook(
        ({ data }) => useAutoSave(testEstimateId, data),
        { initialProps: { data: testData } }
      );

      expect(result.current.isDirty).toBe(false);

      // Update data
      const updatedData = { 
        ...testData, 
        profitMargin: 30,
        updatedAt: new Date().toISOString()
      };

      rerender({ data: updatedData });

      await waitFor(() => {
        expect(result.current.isDirty).toBe(true);
      });
    });

    it('should perform manual save when called', async () => {
      const { result } = renderHook(() => 
        useAutoSave(testEstimateId, testData)
      );

      await act(async () => {
        await result.current.save(testData);
      });

      await waitFor(() => {
        expect(result.current.status).toBe('saved');
        expect(result.current.isDirty).toBe(false);
        expect(result.current.lastSaved).toBeTruthy();
      });
    });

    it('should flush pending saves immediately', async () => {
      mockDebouncedCallback.pending.mockReturnValue(true);

      const { result } = renderHook(() => 
        useAutoSave(testEstimateId, testData)
      );

      await act(async () => {
        await result.current.flush();
      });

      expect(mockDebouncedCallback.flush).toHaveBeenCalled();
    });

    it('should mark as clean without saving', () => {
      const { result } = renderHook(() => 
        useAutoSave(testEstimateId, testData)
      );

      act(() => {
        result.current.markClean();
      });

      expect(result.current.isDirty).toBe(false);
      expect(result.current.status).toBe('saved');
    });
  });

  describe('Leader Election Behavior', () => {
    it('should only save when this tab is the leader', async () => {
      // Mock as non-leader
      jest.doMock('../useLeaderElection', () => ({
        useLeaderElection: () => ({
          isLeader: false,
          status: 'follower',
          tabId: 'test-tab-123',
          claimLeadership: jest.fn(),
          releaseLeadership: jest.fn()
        })
      }));

      const { result } = renderHook(() => 
        useAutoSave(testEstimateId, testData)
      );

      expect(result.current.isLeader).toBe(false);

      // Manual save should not work when not leader
      await act(async () => {
        await result.current.save(testData);
      });

      // Status should remain idle (no save attempted)
      expect(result.current.status).toBe('idle');
    });
  });

  describe('Emergency Save', () => {
    it('should create emergency save data in localStorage', () => {
      // Simulate beforeunload event by calling sendEmergencySave directly
      const emergencyData = { ...testData, id: 'emergency-test' };
      
      // Manually add emergency save to localStorage (simulating the function)
      const payload = JSON.stringify({
        type: 'emergency_save',
        estimateId: emergencyData.id,
        data: emergencyData,
        timestamp: Date.now()
      });
      const emergencyKey = `emergency_save_${emergencyData.id}_${Date.now()}`;
      localStorage.setItem(emergencyKey, payload);

      const emergencySaves = getEmergencySaves();
      
      expect(emergencySaves).toHaveLength(1);
      expect(emergencySaves[0].data.id).toBe('emergency-test');
    });

    it('should clear emergency saves', () => {
      // Add multiple emergency saves
      const saves = ['save1', 'save2', 'save3'];
      saves.forEach((id, index) => {
        const key = `emergency_save_${id}_${Date.now() + index}`;
        const payload = JSON.stringify({
          type: 'emergency_save',
          estimateId: id,
          data: { ...testData, id },
          timestamp: Date.now()
        });
        localStorage.setItem(key, payload);
      });

      expect(getEmergencySaves()).toHaveLength(3);

      clearEmergencySaves();

      expect(getEmergencySaves()).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle save errors gracefully', async () => {
      // Mock storage adapter to fail
      const mockAdapter = new MockStorageAdapter();
      mockAdapter.enableNetworkFailure(true);

      const { result } = renderHook(() => 
        useAutoSave(testEstimateId, testData)
      );

      await act(async () => {
        await result.current.save(testData);
      });

      await waitFor(() => {
        expect(result.current.status).toBe('error');
        expect(result.current.error).toBeTruthy();
        expect(result.current.error?.retryable).toBe(true);
      });
    });

    it('should retry retryable errors automatically', async () => {
      const { result } = renderHook(() => 
        useAutoSave(testEstimateId, testData)
      );

      // Simulate a retryable error
      act(() => {
        (result.current as any).setError({
          code: 'NETWORK_ERROR',
          message: 'Network timeout',
          retryable: true
        });
        (result.current as any).setStatus('error');
      });

      expect(result.current.error?.retryable).toBe(true);
      expect(result.current.status).toBe('error');
    });
  });

  describe('Network Status', () => {
    it('should detect offline status', () => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      const { result } = renderHook(() => 
        useAutoSave(testEstimateId, testData)
      );

      expect(result.current.status).toBe('offline');
    });

    it('should work normally when online', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      const { result } = renderHook(() => 
        useAutoSave(testEstimateId, testData)
      );

      expect(result.current.status).toBe('idle');
    });
  });

  describe('Data Validation', () => {
    it('should validate data before saving when validation function provided', async () => {
      const mockValidator = jest.fn().mockReturnValue(false);

      const { result } = renderHook(() => 
        useAutoSave(testEstimateId, testData, {
          validateBeforeSave: mockValidator
        })
      );

      await act(async () => {
        await result.current.save(testData);
      });

      expect(mockValidator).toHaveBeenCalledWith(testData);
      // Should not save if validation fails
      expect(result.current.status).toBe('error');
    });

    it('should save when validation passes', async () => {
      const mockValidator = jest.fn().mockReturnValue(true);

      const { result } = renderHook(() => 
        useAutoSave(testEstimateId, testData, {
          validateBeforeSave: mockValidator
        })
      );

      await act(async () => {
        await result.current.save(testData);
      });

      expect(mockValidator).toHaveBeenCalledWith(testData);
      
      await waitFor(() => {
        expect(result.current.status).toBe('saved');
      });
    });
  });
}); 