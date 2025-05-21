#!/bin/bash
cd /Users/danielpedraza/3mg-retail-est-d86cbb7d
git checkout develop
git add src/components/estimates/packages/PackageSelector.tsx
git add src/components/estimates/warranties/WarrantySelector.tsx
git add src/components/estimates/materials/MaterialsSelectionTab.tsx
git commit -m "UI: Simplify package and warranty selection with toggle functionality"
git push origin develop 