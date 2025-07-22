# Labor & Profit Tab Updates - Now "Project Details"

## Overview
Renamed the "Labor & Profit" tab to "Project Details" and updated permit logic to allow territory managers and project managers to add additional permits while maintaining a minimum of 1 permit.

## Changes Made

### 1. Tab Renaming
- Changed "Labor & Profit" to "Project Details" throughout the application
- Updated in:
  - `src/pages/SalesRepEstimateFlow.tsx` - Sales rep flow steps and navigation
  - `src/pages/Estimates.tsx` - Main estimates page tabs and messages
  - `src/components/estimates/pricing/EstimateSummaryTab.tsx` - Back button text
  - `src/components/estimates/pricing/SalesRepSummaryTab.tsx` - Back button text

### 2. Permit Logic Updates
- **Default Behavior**: All estimates now default to 1 permit minimum
- **Editable by**: Territory Managers only (NOT Sales Reps)
- **Minimum Enforced**: Cannot set permits below 1
- **UI Changes**:
  - Added editable permit count input field
  - Shows total permit cost (permit count × permit rate)
  - Tooltip explains who can edit permit count
  - Updated message to clarify "at least one permit" required

### 3. Permission System
- Added `canEditPermitCount()` function that allows:
  - Admins (always)
  - Territory Managers (`role === 'manager'`)
- Sales Reps cannot modify permit count

### 4. UI Cleanup
- Removed the blue informational note at the bottom of the tab
- Simplified the permits section with clearer layout
- Added grid layout for permit count and cost display

## Technical Implementation

### Files Modified
1. **`src/components/estimates/pricing/LaborProfitTab.tsx`**
   - Added `isProjectManager` to role checks
   - Created `canEditPermitCount()` permission function
   - Updated permit count handling to allow editing with minimum of 1
   - Added permit count input field with proper permissions
   - Removed blue informational note

2. **Navigation Files**
   - Updated all references from "Labor & Profit" to "Project Details"
   - Maintained icon consistency (Calculator icon)

### Key Code Changes
- Permit count initialization: `Math.max(1, combined.permitCount || 1)`
- Permit count validation: Enforces minimum of 1 when editing
- Total permit cost calculation: `(permitCount × permitRate)`

## User Experience
- **Sales Reps**: See permit cost but cannot modify count (always 1)
- **Territory Managers**: Can adjust permit count as needed (minimum 1)
- **Admins**: Full control over all permit settings
- **All Users**: Clear indication that permits are required

## Testing Checklist
- [ ] Tab displays as "Project Details" in all views
- [ ] Permit count defaults to 1 for new estimates
- [ ] Territory Managers can increase permit count
- [ ] Sales Reps cannot modify permit count
- [ ] Minimum of 1 permit is enforced
- [ ] Total permit cost updates correctly
- [ ] Blue note is removed from bottom of tab 