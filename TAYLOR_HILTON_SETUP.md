# Taylor Hilton User Setup Instructions

## Method 1: Using Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/xtdyirvhfyxmpexvjjcb

2. **Create the User in Authentication**
   - Go to Authentication → Users
   - Click "Invite User" or "Create User"
   - Enter:
     - Email: `Taylor.Hilton@3MGRoofing.com`
     - Password: `Taylor2024!`
   - Click "Create User"

3. **Update the Profile**
   - Go to Table Editor → profiles
   - Find the row with email `Taylor.Hilton@3MGRoofing.com`
   - Click Edit (pencil icon)
   - Update these fields:
     - `full_name`: Taylor Hilton
     - `role`: rep
     - `territory`: Winter Park
   - Save changes

## Method 2: Using SQL Editor

1. **Go to SQL Editor in Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/xtdyirvhfyxmpexvjjcb/sql/new

2. **Run the SQL Script**
   - Copy the entire contents of `create-taylor-hilton.sql`
   - Paste into the SQL editor
   - Click "Run"

3. **Verify Creation**
   - Check the output for success message
   - Go to Authentication → Users to confirm user exists

## Method 3: Using Supabase CLI (If Available)

```bash
# Run the SQL file directly
npx supabase db execute -f create-taylor-hilton.sql
```

## Verification Steps

1. **Test Login**
   - Go to http://localhost:5173
   - Enter credentials:
     - Email: `Taylor.Hilton@3MGRoofing.com`
     - Password: `Taylor2024!`
   - Should see "Sales Dashboard" and "My Estimates" in sidebar

2. **Check Role Permissions**
   - Should NOT see profit margins
   - Should only see own estimates
   - Should have 35% fixed profit margin (hidden)

## Troubleshooting

If login fails:
1. Check that the user exists in Authentication → Users
2. Verify the profile has `role: rep` in profiles table
3. Ensure email is confirmed (email_confirmed_at should have a timestamp)
4. Check browser console for any errors

## User Details

- **Email**: `Taylor.Hilton@3MGRoofing.com`
- **Password**: `Taylor2024!`
- **Role**: rep
- **Territory**: Winter Park
- **Dashboard**: Sales Dashboard
- **Permissions**: Same as other sales representatives 