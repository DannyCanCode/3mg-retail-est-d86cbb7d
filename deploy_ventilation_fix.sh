#!/bin/bash
# Script to deploy ventilation fix to Netlify

echo "Making sure we have latest changes on main branch..."
git checkout main
git pull origin main

echo "Checking for our fix in recent commits..."
git log -5 --oneline

echo "Pushing a small change to force Netlify rebuild..."
# Create a timestamp file to force a new commit
echo "Timestamp: $(date)" > netlify_trigger.txt
git add netlify_trigger.txt
git commit -m "Trigger Netlify deploy for ventilation material fix"
git push origin main

echo "Changes pushed. Netlify should start building shortly."
echo "Check your Netlify dashboard to monitor the deployment." 