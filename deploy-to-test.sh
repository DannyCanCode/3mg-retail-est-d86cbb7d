#!/bin/bash

echo "🚀 Deploying to 3mgestimator2 test site..."
echo "This will NOT affect the production site (3mgretailestimator)"
echo ""

# Build the project
echo "📦 Building project..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "🌐 Deploying to Netlify..."
    netlify deploy --prod
    echo ""
    echo "✨ Deployment complete! Check https://3mgestimator2.netlify.app"
else
    echo "❌ Build failed! Please fix errors before deploying."
    exit 1
fi 