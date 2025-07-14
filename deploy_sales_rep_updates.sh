#!/bin/bash

echo "🚀 Deploying Sales Rep Platform Updates..."

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Error: Must run from project root directory"
    exit 1
fi

# Apply the migration
echo "📦 Applying database migrations..."
npx supabase db push --db-url "postgresql://postgres.xtdyirvhfyxmpexvjjcb:3MgR00fing2024!@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

if [ $? -eq 0 ]; then
    echo "✅ Database migrations applied successfully!"
else
    echo "❌ Error applying database migrations"
    exit 1
fi

# Regenerate types
echo "🔧 Regenerating TypeScript types..."
npx supabase gen types typescript --project-id xtdyirvhfyxmpexvjjcb > src/integrations/supabase/database.types.ts

if [ $? -eq 0 ]; then
    echo "✅ TypeScript types regenerated successfully!"
else
    echo "⚠️  Warning: Could not regenerate types, but migration was successful"
fi

echo "🎉 Sales Rep Platform Updates Deployed Successfully!"
echo ""
echo "Summary of changes:"
echo "✅ Added job_worksheet field to estimates table"
echo "✅ Added submission workflow fields (submission_status, submitted_at, submitted_by)"
echo "✅ Added customer extraction fields to measurements"
echo "✅ Created RLS policies for sales reps and territory managers"
echo "✅ Added performance indexes for submission queries"
echo ""
echo "The platform is now fully functional for sales reps!" 