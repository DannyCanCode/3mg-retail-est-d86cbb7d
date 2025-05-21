#!/bin/bash
# Script to deploy optional package and warranty changes

# Ensure we're on the develop branch
git checkout develop

# Add the changed files
git add src/components/estimates/warranties/WarrantySelector.tsx
git add src/components/estimates/packages/PackageSelector.tsx
git add src/components/estimates/materials/MaterialsSelectionTab.tsx

# Commit the changes
git commit -m "Add options for no package and no warranty selection"

# Push to develop branch
git push origin develop

echo "Optional package and warranty changes deployed to develop branch successfully!" 