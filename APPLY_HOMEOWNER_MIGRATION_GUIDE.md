# Guide to Apply Homeowner Contact Fields Migration

## Migration Status
The migration file `20241228000003_add_homeowner_contact_fields.sql` has been created but NOT yet applied to the Supabase database.

## What the Migration Does
- Adds `owner_email` column with email validation to the `estimates` table
- Adds `owner_phone` column to the `estimates` table
- Creates indexes for better search performance
- Adds documentation comments

## How to Apply the Migration

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `supabase/migrations/20241228000003_add_homeowner_contact_fields.sql`
4. Paste and run the SQL in the editor
5. Verify the columns were added by checking the Table Editor

### Option 2: Using Supabase CLI
```bash
# Make sure you're in the project directory
cd /Users/danielpedraza/3mg-retail-est-d86cbb7d

# Link to your Supabase project (if not already linked)
supabase link --project-ref wycitvqqomdpbwpqsgpb

# Push the migration
supabase db push
```

### Option 3: Direct Database Connection
If you have direct database access, you can run the migration SQL directly.

## After Applying the Migration

### 1. Regenerate TypeScript Types
```bash
# Generate new types from the database
supabase gen types typescript --project-id wycitvqqomdpbwpqsgpb > src/integrations/supabase/database.types.ts
```

### 2. Verify the Migration
Check that the following columns exist in the `estimates` table:
- `owner_email` (TEXT with email validation)
- `owner_phone` (TEXT)

### 3. Test the Functionality
1. Create a new estimate through the Sales Rep flow
2. Enter email and phone in the Homeowner Information tab
3. Submit the estimate
4. Verify the data is saved in the database

## Current Status
✅ Frontend code is ready and waiting for the database fields
❌ Database migration needs to be applied
❌ TypeScript types need to be regenerated after migration

## Note
The frontend is already set up to use these fields. Once the migration is applied and types are regenerated, the feature will be fully functional. 