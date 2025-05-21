#!/bin/bash
# Script to deploy warranty fix to develop branch

# Ensure we're on the develop branch
git checkout develop

# Add the changed file
git add src/components/estimates/materials/MaterialsSelectionTab.tsx

# Commit the changes
git commit -m "Fix: Show Silver Pledge warranty in Selected Materials for both packages"

# Push to develop branch
git push origin develop

echo "Warranty fix deployed to develop branch successfully!" 