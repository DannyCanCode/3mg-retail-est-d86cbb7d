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

- Fixed duplicate rendering issues:
  - Wrapped tab content properly in TabsContent components
  - Made grid responsive based on view mode
  - Removed duplicate sidebar by eliminating MainLayout wrapper
  
- Consistent styling across all user roles while maintaining functionality"

# Push to remote
git push origin main

echo "✅ UI fixes deployed successfully!" 