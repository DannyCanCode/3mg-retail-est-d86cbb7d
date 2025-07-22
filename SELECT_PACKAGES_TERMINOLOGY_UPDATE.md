# Select Packages Terminology Update

## Overview
Updated terminology throughout the application from "Select Materials" to "Select Packages" to better reflect the actual functionality where users select pre-configured packages rather than individual materials.

## Files Updated

### 1. Sales Rep Estimate Flow
**File**: `src/pages/SalesRepEstimateFlow.tsx`
- Changed step title from "Select Materials" to "Select Packages"
- Changed heading from "Material Selection" to "Package Selection"

### 2. Main Estimates Page
**File**: `src/pages/Estimates.tsx`
- Changed tab label from "4. Select Materials" to "4. Select Packages"
- Updated tooltip from "Select Materials - Choose roofing materials and options" to "Select Packages - Choose roofing packages and options"

### 3. Simplified Review Tab
**File**: `src/components/estimates/measurement/SimplifiedReviewTab.tsx`
- Updated toast message from "Now you can select materials" to "Now you can select packages"
- Changed button text from "Continue to Select Materials" to "Continue to Select Packages"

### 4. Materials Selection Tab
**File**: `src/components/estimates/materials/MaterialsSelectionTab.tsx`
- Changed card title from "Select Materials" to "Select Packages"
- Updated empty state text from "Select materials from the list" to "Select packages from the list"
- Updated code comments:
  - "Material Selection Card" → "Package Selection Card"
  - "Left Column: Material Selection" → "Left Column: Package Selection"

### 5. E2E Tests
**File**: `e2e/create-estimate.spec.ts`
- Updated test assertion from "Select Materials" to "Select Packages"

## Impact
This change provides clearer terminology that better represents the actual user workflow where they select pre-configured packages (GAF 1, GAF 2, 3MG Standard, 3MG Select) rather than individual materials. This should reduce confusion and improve user understanding of the system.

## Notes
- The underlying functionality remains unchanged
- Only user-facing text and comments were updated
- No changes to variable names or function names to maintain code stability
- Documentation files were not updated in this pass but may need updates separately 