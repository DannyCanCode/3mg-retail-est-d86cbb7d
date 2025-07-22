# Standardize Sales Rep Role - Remove project_manager

## Overview
Remove all references to `project_manager` role and standardize everything to use `rep` (Sales Rep) for consistency.

## Current State
- Database has both `rep` and `project_manager` roles
- Taylor Hilton currently has `project_manager` role
- Code treats both roles identically but having two names causes confusion

## Migration Plan

### 1. Database Updates

#### A. Update Existing Users
```sql
-- Update all project_manager roles to rep
UPDATE profiles 
SET role = 'rep' 
WHERE role = 'project_manager';

-- Specifically ensure Taylor is updated
UPDATE profiles 
SET role = 'rep' 
WHERE LOWER(email) = 'taylor.hilton@3mgroofing.com';
```

#### B. Update Database Constraints
```sql
-- Update the role check constraint to remove project_manager
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'manager', 'rep', 'subtrade_manager'));
```

### 2. Code Updates Required

#### A. AuthContext.tsx
- Remove `projectManagerConfig` object
- Move Taylor to regular sales rep logic (email ends with @3mgroofing.com)
- Remove all `project_manager` role assignments

#### B. RoleGuard.tsx
- Remove `isProjectManager` variable
- Update `isSalesRep` to only check for 'rep'
- Remove `isProjectManager` from return object

#### C. useSalesRepRestrictions.ts
- Remove `case 'project_manager':` (keep logic under `case 'rep':`)

#### D. Sidebar.tsx
- Remove `case 'project_manager':` (keep navigation under `case 'rep':`)

#### E. Index.tsx
- Remove `|| profile?.role === 'project_manager'` checks

#### F. MaterialsSelectionTab.tsx
- Remove `isProjectManager` usage
- Update comments to refer to "sales reps" instead of "project managers"

#### G. LaborProfitTab.tsx
- Remove `isProjectManager` from destructuring
- Update all comments mentioning project managers

### 3. Documentation Updates
- Update all SQL files that mention project_manager
- Update all markdown documentation
- Update comments in code

### 4. Benefits
- Single source of truth for sales rep role
- No confusion about role names
- Cleaner, more maintainable code
- Easier onboarding for new developers

## Implementation Order

1. **First**: Update database (all users with project_manager → rep)
2. **Second**: Update code to remove project_manager references
3. **Third**: Update documentation
4. **Fourth**: Test with Taylor Hilton's account

## Testing Checklist
- [ ] Taylor can log in with role='rep'
- [ ] Sales dashboard loads correctly
- [ ] All permissions work as expected
- [ ] No references to project_manager remain in code
- [ ] Database constraint updated 