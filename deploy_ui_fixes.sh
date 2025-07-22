#!/bin/bash

# Deploy UI fixes for admin and territory manager dashboards
# Created: $(date)

echo "🚀 Deploying UI fixes..."

# Add all changes
git add -A

# Create deployment commit
git commit -m "feat: Apply dark theme with green accents to all dashboards

- Admin Dashboard: Applied dark theme matching Sales Rep Dashboard
  - Dark gray backgrounds with green accents
  - Gradient metric cards with hover effects  
  - Updated navigation tabs and buttons
  - Styled dialogs and forms for dark theme

- Territory Manager Dashboard: Applied matching dark theme
  - Brightened dashboard with green brittle effects
  - Toned down overly bright sections (header and create estimate)
  - Redesigned estimate cards to be more compact and differentiated
  - Added green brittle background to finalized estimate content
  - Enhanced visual hierarchy with gradients and animations

- Estimate Creation Flow: Applied sales rep styling
  - All tabs now use bg-gray-800/30 for lighter, glittery appearance
  - Added gradient overlays to all tab content sections
  - Updated Review Measurements and Select Packages tabs
  - Applied consistent dark theme to all form elements
  - Matches the beautiful green glittery background of sales rep flow

- Fixed duplicate rendering issues:
  - Wrapped tab content properly in TabsContent components
  - Made grid responsive based on view mode
  - Removed duplicate sidebar by eliminating MainLayout wrapper
  - Restored Start Fresh button and upload functionality
  
- Consistent styling across all user roles while maintaining functionality"

# Push to remote
git push origin main

echo "✅ UI fixes deployed successfully!" 