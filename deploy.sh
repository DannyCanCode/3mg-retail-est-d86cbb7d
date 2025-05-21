#!/bin/bash
git checkout develop
git add src/components/estimates/materials/MaterialsSelectionTab.tsx
git commit -m "Fix: Show Silver Pledge warranty in Selected Materials for both packages"
git push origin develop
echo "Deployment complete" 