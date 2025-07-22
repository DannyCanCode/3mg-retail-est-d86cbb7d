#!/bin/bash

# Deploy script to standardize sales rep role
# This removes project_manager role and updates all users to use 'rep'

echo "🚀 Starting Sales Rep Role Standardization..."
echo "============================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from project root directory"
    exit 1
fi

# Step 1: Commit current changes
echo "📝 Committing current changes..."
git add -A
git commit -m "feat: standardize sales rep role - remove project_manager distinction

- Updated all project_manager roles to rep in codebase
- Removed isProjectManager checks throughout
- Simplified role structure for better maintainability
- Sales reps now have consistent 'rep' role only"

# Step 2: Build the project
echo "🔨 Building project..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix errors and try again."
    exit 1
fi

# Step 3: Deploy to Netlify
echo "🌐 Deploying to Netlify..."
npm run deploy

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 NEXT STEPS:"
echo "1. Run the SQL migration in Supabase:"
echo "   - Go to SQL Editor in Supabase Dashboard"
echo "   - Run standardize-sales-rep-role.sql"
echo ""
echo "2. Verify Taylor Hilton can log in:"
echo "   - Email: taylor.hilton@3mgroofing.com"
echo "   - Should see Sales Dashboard"
echo "   - Role should be 'rep' in database"
echo ""
echo "3. Test that all sales rep features work correctly"
echo ""
echo "🎉 Role standardization deployment complete!" 