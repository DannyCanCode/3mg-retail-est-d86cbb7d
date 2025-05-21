#!/bin/bash
# Check if the low-slope materials automatic selection has been uncommented

echo "Checking if low-slope materials automatic selection is uncommented..."
grep -n "const hasLowPitch = measurements.areasByPitch.some(" src/components/estimates/materials/MaterialsSelectionTab.tsx

echo "Checking for comment block start markers /* in the file..."
grep -n "/\\*" src/components/estimates/materials/MaterialsSelectionTab.tsx

echo "Checking for comment block end markers */ in the file..."
grep -n "\\*/" src/components/estimates/materials/MaterialsSelectionTab.tsx

echo "Done!" 