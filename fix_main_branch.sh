#!/bin/bash
# Script to fix the main branch

# Go to main branch
git checkout main

# Edit the file to fix the import
sed -i '' "s|import { supabase } from './supabase';|import { supabase } from '../../integrations/supabase/client';|" src/lib/supabase/material-waste.ts

# Commit and push the changes
git add src/lib/supabase/material-waste.ts
git commit -m "Fix Supabase import path in material-waste.ts"
git push origin main

# Return to develop branch
git checkout develop

echo "Main branch fixed!" 