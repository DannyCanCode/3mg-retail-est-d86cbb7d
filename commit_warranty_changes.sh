#!/bin/bash
# Script to commit and push warranty selection changes

# Add changed files
git add src/components/estimates/materials/MaterialsSelectionTab.tsx
git add src/components/estimates/warranties/WarrantySelector.tsx 
git add src/components/estimates/packages/PackageSelector.tsx

# Commit changes
git commit -m "Implement conditional warranty selection based on package choice"

# Push to develop branch
git push origin develop

echo "Changes committed and pushed to develop branch!" 