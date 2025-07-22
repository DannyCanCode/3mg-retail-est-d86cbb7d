#!/bin/bash

# Deployment script for UI fixes to match sales rep styling

echo "🎨 Deploying UI fixes for admin and territory manager views..."

# Stage all changes
git add -A

# Commit changes
git commit -m "fix: Update admin and territory manager UI to match sales rep dark theme

- Updated EstimateTypeSelector with dark theme styling
- Fixed all tabs to use green gradient for active state
- Updated all cards and dialogs to use dark backgrounds
- Fixed button styling throughout the estimate flow
- Updated debug info section styling
- Ensured consistent dark theme across all user roles
- Fixed template selector and dialog styling
- Updated form inputs and labels for dark theme"

# Push to remote
git push origin main

echo "✅ UI fixes deployed successfully!"
echo ""
echo "🔍 Changes made:"
echo "- EstimateTypeSelector: Dark cards with green accents"
echo "- Tabs: Green gradient active states"
echo "- Dialogs: Dark backgrounds with proper contrast"
echo "- Buttons: Consistent green gradients and hover states"
echo "- Forms: Dark inputs with green focus states"
echo "- Debug section: Dark theme with green accents"
echo ""
echo "📝 All styling now matches the sales rep dashboard while maintaining role-based permissions and functionality." 