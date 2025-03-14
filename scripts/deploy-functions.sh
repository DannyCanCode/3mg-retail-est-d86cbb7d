#!/bin/bash

# Set project ID from environment variable or use default
PROJECT_ID=${1:-"zdgicsuqfohnufowksgq"}

echo "Deploying process-pdf function to Supabase project: $PROJECT_ID"

# Install Supabase CLI if not already installed
if ! command -v supabase &> /dev/null; then
    echo "Supabase CLI not found, installing..."
    npm install -g supabase
fi

# Login to Supabase (if needed)
echo "Make sure you're logged into Supabase CLI"
supabase login

# Deploy the function
echo "Deploying process-pdf function..."
cd "$(dirname "$0")/../supabase/functions/process-pdf" || exit
supabase functions deploy process-pdf --project-ref "$PROJECT_ID"

echo "Function deployment complete!" 