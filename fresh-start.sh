#!/bin/bash

echo "🧹 Starting complete fresh restart..."

# Kill all node processes
echo "1. Killing all node processes..."
pkill -f node || true
sleep 2

# Clear all caches
echo "2. Clearing all caches..."
rm -rf node_modules/.vite
rm -rf .next
rm -rf dist

# Clear browser storage for localhost
echo "3. Browser cache will need manual clearing..."
echo "   - Open Chrome DevTools (F12)"
echo "   - Go to Application tab"
echo "   - Clear Storage > Clear site data"

# Restart dev server
echo "4. Starting fresh dev server..."
npm run dev 