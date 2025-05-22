#!/bin/bash
# Script to fix the issue with ventilation materials

# Make sure we're on the develop branch
git checkout develop

# Add our changes
git add src/components/estimates/materials/MaterialsSelectionTab.tsx

# Commit the changes
git commit -m "Fix: Allow adding ventilation and accessory materials with default quantity of 1"

# Push to develop
git push origin develop

# Now merge to main
git checkout main
git pull origin main
git merge develop 
git push origin main

echo "Fix has been applied to both develop and main branches" 