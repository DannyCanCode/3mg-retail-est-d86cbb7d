# Migration from LocalStorage to Supabase - Action Plan

## Current Issues

1. **State Persistence Problem**: When sales reps navigate from Materials tab back to Labor & Profit tab, all their material selections, warranty choices, and package selections are lost.

2. **LocalStorage Limitations**: 
   - Data conflicts between multiple users
   - Not scalable for 200+ sales reps
   - Data persists across sessions when it shouldn't
   - Security concerns with sensitive pricing data

## Immediate Fix Applied

Updated `SalesRepEstimateFlow.tsx` to properly pass state between components:
- Added warranty and package data to EstimateData interface
- Pass selectedMaterials and quantities props to MaterialsSelectionTab
- Materials now persist when navigating between tabs

## Migration Strategy

### Phase 1: Session-Based State Management (Immediate)
- [x] Fix state persistence in SalesRepEstimateFlow
- [ ] Replace useLocalStorage with useState for session data
- [ ] Clear data on estimate submission or navigation away

### Phase 2: Database Draft System (Next Sprint)
- [ ] Create `estimate_drafts` table in Supabase
- [ ] Auto-save draft every 30 seconds
- [ ] Load draft on page refresh
- [ ] Clear draft on submission

### Phase 3: Real-time Collaboration (Future)
- [ ] Implement real-time updates for manager review
- [ ] Add collaborative editing features
- [ ] Territory-based permissions

## Database Schema for Drafts

```sql
CREATE TABLE estimate_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  territory_id UUID REFERENCES territories(id),
  estimate_data JSONB NOT NULL,
  current_step INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Index for fast lookups
CREATE INDEX idx_estimate_drafts_user_id ON estimate_drafts(user_id);
CREATE INDEX idx_estimate_drafts_expires_at ON estimate_drafts(expires_at);

-- RLS policies
ALTER TABLE estimate_drafts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own drafts
CREATE POLICY "Users can view own drafts" ON estimate_drafts
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own drafts
CREATE POLICY "Users can create own drafts" ON estimate_drafts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own drafts
CREATE POLICY "Users can update own drafts" ON estimate_drafts
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own drafts
CREATE POLICY "Users can delete own drafts" ON estimate_drafts
  FOR DELETE USING (auth.uid() = user_id);
```

## Implementation Steps

1. **Remove localStorage usage**:
   ```typescript
   // Replace this:
   const [estimateData, setEstimateData] = useLocalStorage<EstimateData>('salesRepEstimate', {...});
   
   // With this:
   const [estimateData, setEstimateData] = useState<EstimateData>({...});
   ```

2. **Add draft auto-save**:
   ```typescript
   // Auto-save to Supabase every 30 seconds
   useEffect(() => {
     const saveTimer = setInterval(async () => {
       if (estimateData && hasChanges) {
         await saveDraft(estimateData);
       }
     }, 30000);
     
     return () => clearInterval(saveTimer);
   }, [estimateData]);
   ```

3. **Load draft on mount**:
   ```typescript
   useEffect(() => {
     const loadDraft = async () => {
       const draft = await fetchLatestDraft();
       if (draft) {
         setEstimateData(draft.estimate_data);
         setCurrentStep(draft.current_step);
       }
     };
     loadDraft();
   }, []);
   ```

## Testing Plan

1. Test with multiple concurrent users
2. Verify no data conflicts
3. Test draft recovery after browser refresh
4. Test draft expiration
5. Performance testing with 200+ users

## Rollback Plan

If issues arise:
1. Keep localStorage code commented but available
2. Feature flag to toggle between localStorage and Supabase
3. Export utility to migrate localStorage data to Supabase

## Success Metrics

- Zero data loss incidents
- < 2 second draft save time
- 99.9% draft recovery success rate
- Support for 500+ concurrent users 