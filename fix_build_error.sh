#!/bin/bash
# Script to fix the build error and apply to both branches

echo "Starting build error fix process..."

# Commit the fix on develop branch
echo "Committing fix on develop branch..."
git add src/lib/supabase/material-waste.ts
git commit -m "Fix Supabase import path in material-waste.ts"
git push origin develop

# Apply the same fix to main branch
echo "Applying fix to main branch..."
git checkout main
git pull origin main
git cherry-pick -x $(git rev-parse HEAD~0)
git push origin main

# Go back to develop branch
echo "Returning to develop branch..."
git checkout develop

echo "Build error fix complete!" 