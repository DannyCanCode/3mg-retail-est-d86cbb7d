#!/bin/bash
# Script to deploy fix for low slope materials auto-selection

# Ensure we're on the develop branch
git checkout develop

# Add the changed file
git add src/components/estimates/materials/MaterialsSelectionTab.tsx

# Commit the changes
git commit -m "Fix: Restore low-slope materials automatic selection functionality"

# Push to develop branch
git push origin develop

echo "Low-slope materials auto-selection fix deployed to develop branch successfully!" 