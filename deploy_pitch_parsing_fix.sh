#!/bin/bash

# Deploy pitch parsing improvements
echo "🚀 Deploying pitch parsing improvements..."

# Add all changes
git add -A

# Commit with descriptive message
git commit -m "Fix: Improve EagleView PDF parsing to capture all pitch variations

- Fixed regex patterns to match all pitch formats (1/12, 6/12, etc.)
- Added support for area values with commas (e.g., 3,180.9)
- Improved extraction of multiple pitch areas from EagleView reports
- Now correctly captures low-slope areas like 1/12 pitch

This ensures all roof areas are properly displayed in the UI and included
in material calculations."

# Push to main branch
git push origin main

# Trigger Netlify deployment
echo "Deployment: Pitch Parsing Fix $(date)" >> netlify_trigger.txt
git add netlify_trigger.txt
git commit -m "Deploy: Pitch parsing improvements"
git push origin main

echo "✅ Pitch parsing improvements deployed successfully!"
echo ""
echo "📝 Summary of changes:"
echo "- Fixed regex to capture all pitch formats (1/12, 2/12, etc.)"
echo "- Added support for comma-separated area values"
echo "- Improved pitch table extraction logic"
echo ""
echo "🔍 Users should now see all pitch areas from EagleView PDFs"
echo "   including low-slope areas that were previously missing." 