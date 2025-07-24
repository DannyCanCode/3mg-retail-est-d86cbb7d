# Underlayment System Update Summary

## Overview
This update implements critical changes to the underlayment system for GAF packages, with special handling for Florida properties and the "Upgrade to Full Peel and Stick System" option.

## Key Changes Implemented

### 1. Full Peel & Stick System Upgrade
When "Upgrade to Full Peel and Stick System" is selected:

#### Materials Removed:
- GAF FeltBuster Synthetic Underlayment
- ABC Pro Guard 20 (Rhino)
- MaxFelt NC (**NEW** - now properly removed)
- Poly Glass IRXE (valley material)

#### Materials Added:
- GAF StormGuard Ice & Water Shield applied to **entire steep slope area** (>2/12 pitch)
- Quantity calculated as: Steep Slope Area ÷ 150 sq ft per roll (1.5 squares/roll)

### 2. Florida Underlayment Doubling
For properties located in Florida (detected by "FL" or "Florida" in address):
- All underlayment quantities are **automatically doubled**
- Applies to:
  - MaxFelt NC
  - GAF FeltBuster Synthetic Underlayment
  - ABC Pro Guard 20
  - GAF StormGuard Ice & Water Shield
  - Poly Glass IRXE
  - Rhino Synthetic
  - Polyglass Ice & Water Shield
  - Rhino G P&S

#### Visual Indicators:
- 🌴 **FL Double Coverage** badge appears on underlayment materials
- Orange color coding (bg-orange-100/600)
- Shows base quantity in addition to doubled quantity
- Displays message: "Quantity doubled per Florida building code requirements"

### 3. Package Descriptions Updated

#### GAF Package 1:
- GAF Timberline HDZ Shingles
- ABC Pro Guard 20 (Rhino) Underlayment
- GAF StormGuard (Valleys)
- Basic Ventilation

#### GAF Package 2:
- GAF Timberline HDZ Shingles
- GAF FeltBuster Synthetic Underlayment
- GAF StormGuard (Valleys)
- Enhanced Ventilation System

### 4. Material Bundle Corrections
- Fixed MaxFelt material name to "MaxFelt NC" in all package bundles
- Ensured consistency across:
  - 3MG Standard - OC
  - 3MG Select
  - OC 2

## Testing Instructions

1. **Test Florida Doubling:**
   - Create an estimate with a Florida address
   - Select any GAF package
   - Verify underlayment quantities are doubled
   - Check for 🌴 FL Double Coverage badges

2. **Test Peel & Stick Upgrade:**
   - Select GAF Package 2
   - Check "Upgrade to Full Peel & Stick System"
   - Verify:
     - FeltBuster is removed
     - MaxFelt NC is removed (if present)
     - StormGuard quantity covers entire steep slope area

3. **Test Non-Florida Properties:**
   - Create estimate with non-Florida address
   - Verify normal underlayment quantities
   - No Florida badges should appear

## Important Notes

- Florida doubling applies to ALL underlayments, not just those in packages
- Peel & Stick upgrade cost is $60/square for steep slope areas
- StormGuard coverage: 1.5 squares (150 sq ft) per roll
- The system automatically detects Florida from the address field in Job Worksheet

## Code Locations

- Main logic: `src/components/estimates/materials/MaterialsSelectionTab.tsx`
- Package descriptions: `src/components/estimates/packages/GAFPackageSelector.tsx`
- Material definitions: `src/components/estimates/materials/data.ts` 