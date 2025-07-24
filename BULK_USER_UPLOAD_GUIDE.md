# 📋 Bulk User Upload Guide for 3MG Retail Estimator

## 🎯 Overview

This guide helps you bulk upload users (project managers/sales reps) and assign them to the correct territories under their territory managers.

## 📊 Current Territory Structure

### Territory Managers & Their Territories:

| Manager | Email | Territory | 
|---------|-------|-----------|
| Josh VanHorn | josh.vanhorn@3mgroofing.com | Southwest Florida |
| Jacob Kallhoff | jacob.kallhoff@3mgroofing.com | North Central Florida |
| Chase Lovejoy | chase.lovejoy@3mgroofing.com | Central Florida |
| Adam | adam@3mgroofing.com | Central Florida |
| DM Pearl | dmpearl@3mgroofing.com | South Florida |
| Nickolas Nell | nickolas.nell@3mgroofing.com | Southeast Florida |
| Harrison Cremata | harrison.cremata@3mgroofing.com | Northeast Florida |

### Territory Name Mapping:

**Old Name → New Name:**
- Tampa → Southwest Florida
- Miami → South Florida
- Winter Park → Central Florida
- Ocala → North Central Florida
- Jacksonville → Northeast Florida
- Stuart → Southeast Florida
- St. Louis → East Missouri
- Kansas City → West Missouri

## 🚀 Quick Start

### Step 1: Prepare Your Excel/CSV File

Create an Excel file with these columns:
- **Email** - User's email address
- **Full Name** - User's full name
- **Role** - Either "rep" or "manager"
- **Territory** - Use the NEW territory names (e.g., "Central Florida", not "Winter Park")
- **Manager Email** - The territory manager's email

Example:
```csv
Email,Full Name,Role,Territory,Manager Email
john.smith@3mgroofing.com,John Smith,rep,Southwest Florida,josh.vanhorn@3mgroofing.com
jane.doe@3mgroofing.com,Jane Doe,rep,Central Florida,chase.lovejoy@3mgroofing.com
```

### Step 2: Get Your Service Role Key

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/xtdyirvhfyxmpexvjjcb)
2. Navigate to Settings → API
3. Copy the `service_role` key (NOT the `anon` key)

### Step 3: Run the Bulk Upload

```bash
# Set your service role key
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# Run the bulk upload
node bulk-user-upload-template.js your-users.xlsx
```

## 📝 Script Features

### ✅ What the Script Does:

1. **Creates Auth Users** - Sets up login credentials
2. **Assigns to Territories** - Links users to correct territory
3. **Sets Up Profiles** - Creates profile with role and territory
4. **Generates Passwords** - Creates secure passwords (FirstName3MG####!)
5. **Saves Credentials** - Outputs a CSV file with all login info
6. **Handles Errors** - Reports any failed user creations

### 🔒 Password Format:
- Default: `FirstName3MG####!` (e.g., John3MG1234!)
- You can specify custom passwords in the Excel file

### 📄 Output Files:
- `user-credentials-YYYY-MM-DD.csv` - Contains all created users and passwords

## 🛠️ Troubleshooting

### Common Issues:

1. **"Territory not found"**
   - Make sure you're using the NEW territory names
   - Check spelling exactly matches (e.g., "Central Florida" not "central florida")

2. **"User already exists"**
   - The email is already in the system
   - Check if they need to be updated instead

3. **"Invalid service role key"**
   - Make sure you're using the service_role key, not the anon key
   - Check that the environment variable is set correctly

## 📊 Example Bulk Upload File

Save this as `users-to-upload.csv`:

```csv
Email,Full Name,Role,Territory,Manager Email
john.smith@3mgroofing.com,John Smith,rep,Southwest Florida,josh.vanhorn@3mgroofing.com
jane.doe@3mgroofing.com,Jane Doe,rep,Central Florida,chase.lovejoy@3mgroofing.com
mike.johnson@3mgroofing.com,Mike Johnson,rep,Central Florida,adam@3mgroofing.com
sarah.williams@3mgroofing.com,Sarah Williams,rep,North Central Florida,jacob.kallhoff@3mgroofing.com
robert.brown@3mgroofing.com,Robert Brown,rep,South Florida,dmpearl@3mgroofing.com
emily.davis@3mgroofing.com,Emily Davis,rep,Southeast Florida,nickolas.nell@3mgroofing.com
david.miller@3mgroofing.com,David Miller,rep,Northeast Florida,harrison.cremata@3mgroofing.com
```

## 🔍 Verification

After bulk upload:

1. **Check Manager Dashboards**
   - Managers should see new team members
   - Team count should update

2. **Test User Login**
   - Try logging in with generated credentials
   - Users should see their assigned territory

3. **Database Check**
   - Run the SQL query to verify assignments:
   ```sql
   SELECT p.email, p.full_name, p.role, t.name as territory
   FROM profiles p
   JOIN territories t ON p.territory_id = t.id
   ORDER BY t.name, p.role, p.email;
   ```

## 📞 Support

If you encounter issues:
1. Check the error messages in the console
2. Verify territory names match exactly
3. Ensure service role key is correct
4. Check that manager emails are valid

## 🎯 Next Steps

After successful bulk upload:
1. Distribute credentials to users
2. Have users change passwords on first login
3. Managers can start assigning estimates to their team
4. Monitor user activity in dashboards 