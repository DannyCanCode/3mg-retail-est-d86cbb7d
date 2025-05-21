#!/bin/bash
# Deploy low-slope materials automatic selection fix to develop branch

cd /Users/danielpedraza/3mg-retail-est-d86cbb7d
git checkout develop
git add src/components/estimates/materials/MaterialsSelectionTab.tsx
git commit -m "Fix: Restore low-slope materials automatic selection functionality"
git push origin develop

echo "Low-slope materials auto-selection fix deployed to develop branch successfully!" 