#!/bin/bash
# Check if our Silver Pledge warranty change is in the current codebase
echo "Checking for Silver Pledge warranty fix in the current code..."
grep -n "if (selectedWarranty === \"silver-pledge\")" src/components/estimates/materials/MaterialsSelectionTab.tsx
echo "Done!" 