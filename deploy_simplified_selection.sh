#!/bin/bash
# Script to deploy simplified package and warranty selection UI

# Ensure we're on the develop branch
git checkout develop

# Add the changed files
git add src/components/estimates/packages/PackageSelector.tsx
git add src/components/estimates/warranties/WarrantySelector.tsx
git add src/components/estimates/materials/MaterialsSelectionTab.tsx

# Commit the changes
git commit -m "UI: Simplify package and warranty selection with toggle functionality"

# Push to develop branch
git push origin develop

echo "Simplified package and warranty selection UI deployed to develop branch successfully!" 