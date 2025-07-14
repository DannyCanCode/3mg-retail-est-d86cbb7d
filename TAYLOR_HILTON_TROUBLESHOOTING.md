# Taylor Hilton Login Troubleshooting Guide

## Issue Summary
Taylor Hilton cannot log in to the application after user creation attempts.

## Root Cause Analysis
Based on the SQL files, the main issues are:

1. **Schema Mismatch**: The `create-taylor-hilton.sql` file uses `territory` instead of `territory_id`
2. **Case Sensitivity**: Email case inconsistency between database and login form
3. **Missing Database Links**: Incomplete user creation in auth.users and profiles tables

## Step-by-Step Fix

### 1. Run the Debug Script
Execute the `debug-taylor-login.sql` script to properly create Taylor's account:

```bash
# Connect to your Supabase database and run the debug script
```

### 2. Use Correct Login Credentials
- **Email**: `taylor.hilton@3mgroofing.com` (lowercase)
- **Password**: `Taylor2024!`

### 3. Verify Environment Setup
Check that your `.env.local` file has:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Test Login Process
1. Navigate to `http://localhost:5173` (or your dev server port)
2. Use the exact credentials above
3. Check browser console for any errors
4. Check Network tab for failed requests

## Common Issues & Solutions

### Issue 1: "Invalid login credentials"
- **Solution**: Use exact email case: `taylor.hilton@3mgroofing.com`
- **Verification**: Check database for exact email format

### Issue 2: "Email not confirmed"
- **Solution**: The debug script sets `email_confirmed_at` to NOW()
- **Verification**: Check `auth.users` table for confirmation timestamp

### Issue 3: User exists but profile missing
- **Solution**: The debug script creates both auth.users and profiles records
- **Verification**: Check that both records exist and are linked

### Issue 4: Territory not found
- **Solution**: Use `territory_id` (UUID) instead of `territory` (string)
- **Verification**: Check that Winter Park territory exists and is linked

### Issue 5: Development server not running
- **Solution**: Run `npm run dev` in project directory
- **Verification**: Server should be accessible at localhost

## Database Schema Reference

### profiles table structure:
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'rep',
  territory_id UUID REFERENCES territories(id),  -- Note: territory_id, not territory
  org_id UUID REFERENCES organizations(id),
  completed_onboarding BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Expected role values:
- `admin` - Full system access
- `manager` - Territory-level access (Taylor should be this)
- `rep` - Sales representative access
- `subtrade_manager` - Subtrade management access

## Manual Verification Steps

1. **Check auth.users table**:
   ```sql
   SELECT id, email, encrypted_password IS NOT NULL, email_confirmed_at 
   FROM auth.users 
   WHERE email = 'taylor.hilton@3mgroofing.com';
   ```

2. **Check profiles table**:
   ```sql
   SELECT p.*, t.name as territory_name 
   FROM profiles p 
   LEFT JOIN territories t ON p.territory_id = t.id 
   WHERE p.email = 'taylor.hilton@3mgroofing.com';
   ```

3. **Test password hash**:
   ```sql
   SELECT email, (encrypted_password = crypt('Taylor2024!', encrypted_password)) as password_matches
   FROM auth.users 
   WHERE email = 'taylor.hilton@3mgroofing.com';
   ```

## Next Steps if Login Still Fails

1. Check browser console for JavaScript errors
2. Verify Supabase connection in Network tab
3. Check that the correct branch/deployment is running
4. Verify that RLS (Row Level Security) policies allow access
5. Test with a different browser or incognito mode

## Contact Information

If issues persist, check:
- Environment variables are correctly set
- Database connection is working
- Development server is running on the correct port
- All database migrations have been applied

---

**Last Updated**: December 2024
**Status**: Active troubleshooting 