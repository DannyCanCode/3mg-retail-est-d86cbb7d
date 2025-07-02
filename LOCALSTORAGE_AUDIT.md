# LocalStorage Usage Audit - Pre Auto-Save Migration

## Overview
Documentation of all localStorage usage before implementing server-side auto-save.

## Current localStorage Keys & Usage

### **Estimate-related data (TO BE MIGRATED):**
```typescript
// Primary estimate data
"estimateExtractedPdfData" → ParsedMeasurements | null
"estimatePdfFileName" → string  
"estimateSelectedMaterials" → {[key: string]: Material}
"estimateQuantities" → {[key: string]: number}
"estimateLaborRates" → LaborRates
"estimateProfitMargin" → number
"estimateType" → 'roof_only' | 'with_subtrades' | null
"estimateSelectedSubtrades" → string[]
"estimateActiveTab" → string
"estimatePeelStickCost" → string
```

### **System/utility data (TO BE PRESERVED):**
```typescript
// Debug logging
"debug" → "true" | null

// Supabase client probe  
"__probe" → "1" (temporary)

// Auth session cache (AuthContext.tsx)
"auth_fast_load" → SessionCache (preserved)
```

## Current Hook Usage Pattern

**File: `src/hooks/useLocalStorage.ts`**
- Generic hook: `useLocalStorage<T>(key: string, initialValue: T)`
- Automatic JSON serialization/deserialization
- Cross-tab synchronization via storage events
- Error handling for blocked localStorage

**File: `src/pages/Estimates.tsx`**
- 10 different localStorage keys for estimate state
- All estimate-related data stored locally
- State recovery on page refresh
- Manual cleanup functions

## Migration Strategy

### **Phase 1: Preserve**
- Keep auth session cache
- Keep debug logging 
- Keep Supabase client utilities

### **Phase 2: Migrate to Server**
- Move all "estimate*" keys to server storage
- Replace useLocalStorage with useAutoSave for estimate data
- Add offline queue for when server unavailable

### **Phase 3: Cleanup**
- Remove unused localStorage keys
- Add migration utility for existing user data
- Update useLocalStorage hook for remaining system data

## Data Relationships

```typescript
// These keys form a complete estimate state:
extractedPdfData → selectedMaterials → quantities → laborRates → profitMargin → type
                ↓
              Final estimate ready for save/submit
```

## Notes
- PDF data can be 1-5MB (largest localStorage item)
- Materials/quantities are interdependent
- activeTab state critical for UX preservation
- laborRates have complex nested structure 