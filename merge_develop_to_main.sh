#!/bin/bash
# Script to merge develop into main and push changes

# Stash any local changes
echo "Stashing local changes..."
git stash

# Make sure we're on the main branch and it's up to date
echo "Checking out main branch..."
git checkout main || { echo "Failed to checkout main"; exit 1; }
git pull origin main || { echo "Failed to pull latest main"; exit 1; }

# Merge develop into main
echo "Merging develop into main..."
git merge develop || { echo "Merge failed"; exit 1; }

# Push changes to origin
echo "Pushing changes to remote..."
git push origin main || { echo "Failed to push changes"; exit 1; }

echo "Successfully merged develop into main and pushed changes!"

# Go back to develop branch
echo "Switching back to develop branch..."
git checkout develop

# Restore any stashed changes if needed
echo "Restoring stashed changes..."
git stash pop || echo "No stashed changes or conflict in applying them" 