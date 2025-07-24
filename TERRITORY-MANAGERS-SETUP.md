# Territory Managers Setup Guide

## 🎯 Overview
This guide explains how to create territory managers for the 3MG Roofing Estimator system with their unique territories and credentials.

## 📊 Territory Structure

### Territories Created:
- **Tampa** - Central Florida region
- **North Central Florida** - North Central Florida region  
- **Central Florida** - Central Florida region (Greater Orlando area)
- **South Florida** - South Florida region
- **Northeast Florida** - Northeast Florida region
- **Southeast Florida** - Southeast Florida region
- **East Missouri** - East Missouri region
- **West Missouri** - West Missouri region

## 👥 Territory Managers to Create

### 1. Josh VanHorn - Tampa Territory Manager
- **Email**: `Josh.VanHorn@3MGRoofing.com`
- **Password**: `3MGTampa2024!`
- **Territory**: Tampa
- **Role**: manager

### 2. Jacob Kallhoff - North Central Florida Territory Manager
- **Email**: `Jacob.Kallhoff@3MGRoofing.com`
- **Password**: `3MGNorthCentralFlorida2024!`
- **Territory**: North Central Florida
- **Role**: manager

### 3. Chase Lovejoy - Central Florida Territory Manager
- **Email**: `Chase.Lovejoy@3MGRoofing.com`
- **Password**: `3MGCentralFlorida2024!`
- **Territory**: Central Florida
- **Role**: manager

### 4. Adam - Central Florida Territory Manager
- **Email**: `adam@3mgroofing.com`
- **Password**: `3MGCentralFlorida2024!`
- **Territory**: Central Florida
- **Role**: manager

### 5. DM Pearl - South Florida Territory Manager
- **Email**: `dmpearl@3MGRoofing.com`
- **Password**: `3MGSouthFlorida2024!`
- **Territory**: South Florida
- **Role**: manager

### 6. Nickolas Nell - Southeast Florida Territory Manager
- **Email**: `nickolas.nell@3mgroofing.com`
- **Password**: `3MGSoutheastFlorida2024!`
- **Territory**: Southeast Florida
- **Role**: manager

### 7. Harrison Cremata - Northeast Florida Territory Manager
- **Email**: `harrison.cremata@3mgroofing.com`
- **Password**: `3MGNortheastFlorida2024!`
- **Territory**: Northeast Florida
- **Role**: manager

## 🚀 Method 1: Using Supabase Admin API (Recommended)

### Prerequisites:
1. Get the `SUPABASE_SERVICE_ROLE_KEY` from your Supabase dashboard
2. Run the provided Node.js script

### Steps:
```bash
# 1. Set environment variable
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# 2. Run the territory manager creation script
node create-territory-managers.js
```

## 🛠 Method 2: Manual Creation via Supabase Dashboard

### Step 1: Access Supabase Dashboard
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your 3MG Estimator project
3. Navigate to "Authentication" → "Users"

### Step 2: Create Each User
For each territory manager:

1. **Click "Add User"**
2. **Fill in details**:
   - Email: (use emails from list above)
   - Password: (use passwords from list above)
   - Check "Email Confirmed" ✅
   - Leave "Phone Confirmed" unchecked

3. **Set User Metadata**:
   ```json
   {
     "full_name": "Josh VanHorn",
     "role": "manager",
     "is_admin": false,
     "completed_onboarding": true
   }
   ```

4. **Click "Create User"**

### Step 3: Update Profiles Table
For each created user:

1. Navigate to "Table Editor" → "profiles"
2. Find the user's profile row (by email)
3. Update the following fields:
   - `role`: `manager`
   - `territory_id`: (Get from territories table - see step 4)
   - `job_title`: `Tampa Territory Manager` (adjust for territory)
   - `completed_onboarding`: `true`

### Step 4: Get Territory IDs
1. Navigate to "Table Editor" → "territories"
2. Note down the UUIDs for each territory:
   - Tampa: `[UUID from database]`
   - Ocala: `[UUID from database]`
   - Winter Park: `[UUID from database]`
   - Miami: `[UUID from database]`

## 🔧 Method 3: Using SQL Commands

Run these SQL commands in your Supabase SQL Editor:

```sql
-- First, get territory IDs
SELECT id, name FROM territories;

-- Create users using auth.users (you'll need to do this through the dashboard)
-- Then update their profiles:

-- Josh VanHorn (Tampa)
UPDATE profiles 
SET 
  role = 'manager',
  territory_id = (SELECT id FROM territories WHERE name = 'Tampa'),
  job_title = 'Tampa Territory Manager',
  completed_onboarding = true
WHERE email = 'Josh.VanHorn@3MGRoofing.com';

-- Jacob Kallhoff (North Central Florida)
UPDATE profiles 
SET 
  role = 'manager',
  territory_id = (SELECT id FROM territories WHERE name = 'North Central Florida'),
  job_title = 'North Central Florida Territory Manager',
  completed_onboarding = true
WHERE email = 'Jacob.Kallhoff@3MGRoofing.com';

-- Chase Lovejoy (Central Florida)
UPDATE profiles 
SET 
  role = 'manager',
  territory_id = (SELECT id FROM territories WHERE name = 'Central Florida'),
  job_title = 'Central Florida Territory Manager',
  completed_onboarding = true
WHERE email = 'Chase.Lovejoy@3MGRoofing.com';

-- Adam (Central Florida)
UPDATE profiles 
SET 
  role = 'manager',
  territory_id = (SELECT id FROM territories WHERE name = 'Central Florida'),
  job_title = 'Central Florida Territory Manager',
  completed_onboarding = true
WHERE email = 'adam@3mgroofing.com';

-- DM Pearl (South Florida)
UPDATE profiles 
SET 
  role = 'manager',
  territory_id = (SELECT id FROM territories WHERE name = 'South Florida'),
  job_title = 'South Florida Territory Manager',
  completed_onboarding = true
WHERE email = 'dmpearl@3MGRoofing.com';

-- Nickolas Nell (Southeast Florida)
UPDATE profiles 
SET 
  role = 'manager',
  territory_id = (SELECT id FROM territories WHERE name = 'Southeast Florida'),
  job_title = 'Southeast Florida Territory Manager',
  completed_onboarding = true
WHERE email = 'nickolas.nell@3mgroofing.com';

-- Harrison Cremata (Northeast Florida)
UPDATE profiles 
SET 
  role = 'manager',
  territory_id = (SELECT id FROM territories WHERE name = 'Northeast Florida'),
  job_title = 'Northeast Florida Territory Manager',
  completed_onboarding = true
WHERE email = 'harrison.cremata@3mgroofing.com';
```

## ✅ Verification Steps

### 1. Check User Creation
```sql
SELECT 
  p.email,
  p.full_name,
  p.role,
  t.name as territory_name,
  p.job_title
FROM profiles p
LEFT JOIN territories t ON p.territory_id = t.id
WHERE p.role = 'manager'
ORDER BY t.name;
```

### 2. Test Login
1. Try logging in with each manager's credentials
2. Verify they are redirected to `/manager` dashboard
3. Check they can see estimates in their territory

### 3. Test Territory Manager Functions
For each manager:
- ✅ Can mark estimates as sold
- ✅ Can delete estimates (frontend-only)
- ✅ Dashboard shows correct territory name
- ✅ Only sees estimates in their territory

## 🔐 Security Notes

- **Passwords are temporary** - managers should change them on first login
- **Roles are enforced** - managers can only access their territory data
- **Database policies** prevent cross-territory access
- **Frontend routing** automatically redirects managers to correct dashboard

## 📱 Access Information

### Login URL: 
`https://3mgretailestimator.netlify.app/`

### Dashboard Access:
- Territory managers will automatically be redirected to `/manager` after login
- Each manager will see their territory name in the dashboard header
- Only estimates in their assigned territory will be visible

## 🆘 Troubleshooting

### Issue: User can't login
- Verify email is confirmed in Supabase Auth
- Check password was set correctly
- Ensure user exists in both `auth.users` and `profiles` tables

### Issue: Manager sees wrong dashboard
- Check `role` field in profiles table = `'manager'`
- Verify `territory_id` is correctly assigned
- Clear browser cache and localStorage

### Issue: Can't see estimates
- Verify estimates have `territory_id` assigned
- Check RLS policies are enabled
- Ensure territory manager has correct `territory_id` in profile

### Issue: Delete/Sold buttons not working
- Verify recent code deployment includes latest fixes
- Check browser console for JavaScript errors
- Ensure user has `manager` role, not `territory_manager`

---

## 📞 Next Steps

After creating territory managers:

1. **Test each account** individually
2. **Assign existing estimates** to territories if needed
3. **Train managers** on the system functionality
4. **Set up ongoing support** for user issues

**🎉 Once completed, territory managers will be fully operational!** 