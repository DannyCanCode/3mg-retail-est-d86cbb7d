# 3MG Roofing Estimator - Admin & Manager Release

This is a production-ready version of the 3MG Roofing Estimator, focused on providing immediate, stable functionality for Admins and Territory Managers.

## 📅 Implementation Status
**Current Phase:** Pre-Launch  
**Go-Live Date:** August 12, 2025  
**Full Roadmap:** [See Implementation Roadmap](./README-IMPLEMENTATION-ROADMAP-2025.md)  
**Visual Timeline:** [See Project Timeline](./PROJECT-TIMELINE-VISUAL.md)

## 🚀 **Deployment & Access**

This version is deployed on Netlify from the `release/admin-estimator-v1` branch.

### **Authentication**
- **Registration**: `/register` - Managers can self-register with their `@3mgroofing.com` email and password.
- **Email Confirmation**: New users must confirm their email address before logging in.
- **Login**: `/login` - Standard email and password login.
- **Admin Access**: Admins are created via the Supabase dashboard and have full system access.

---

## ✅ **Core Features**

### **1. Role-Based Permissions**
- **Admins**: Full control over all estimates, pricing, users, and territories.
- **Managers**: Can create estimates, approve/reject estimates within their assigned territory, and have a restricted profit margin of 30-35%.

### **2. Estimate Workflow**
- Create, edit, and manage detailed roofing estimates.
- Territory-based approval workflow for managers.
- Real-time updates for new estimates and status changes.

### **3. Pricing & Materials**
- Admins can manage material prices and pricing templates.
- **Managers cannot change material prices.**
- Profit margins are enforced based on user role.

### **4. User & Territory Management**
- Admins can invite new users and assign them to roles and territories.
- A simplified user management interface for admins.

---

## 🚨 **PRODUCTION URGENCY FIXES - RELEASE ADMIN v1**

### **Critical Issues Requiring Immediate Fix**

#### **Issue #1: Wording Consistency - "Approve" → "Accepted"**
- **Problem**: Finalized estimates show "Approve" which is confusing
- **Solution**: Replace all instances of "Approve" with "Accepted" for finalized estimates
- **Files to Update**:
  - `src/components/ui/EstimateCard.tsx` - Button text and dialog titles
  - `src/components/estimates/pricing/EstimateSummaryTab.tsx` - Approve button/dialog
  - `src/components/dashboard/RecentEstimates.tsx` - Button text and tabs
  - `src/pages/ManagerDashboard.tsx` - Button text and status displays
  - `src/pages/SalesRepDashboard.tsx` - Tab labels and status text
  - `src/components/dashboard/DashboardOverview.tsx` - Metric labels
  - `src/components/estimates/AuditTrail.tsx` - Status icons and badges
- **Priority**: HIGH - User Experience

#### **Issue #2: Input Field Typing Restrictions**
- **Problem**: Several input fields only allow one integer at a time instead of full numbers
- **Affected Fields**:
  - Labor and Profit tab: `gutterLinearFeet` input (Line 756-759)
  - Labor and Profit tab: `downspoutCount` input (Line 830-833)
  - Labor and Profit tab: `skylights2x2Count` input (Line 889-892)
  - Labor and Profit tab: `skylights2x4Count` input (Line 902+)
  - Waste factor: `wastePercentage` input (Line 1059-1061)
- **Root Cause**: Likely `maxLength={1}` or incorrect input event handling
- **Solution**: Review input field configurations in `LaborProfitTab.tsx` and remove typing restrictions
- **Files to Fix**:
  - `src/components/estimates/pricing/LaborProfitTab.tsx` - All quantity/percentage inputs
- **Priority**: HIGH - Functional Blocker

#### **Issue #3: Material Categories Reorganization**
- **Problem**: "Full W.W Peel & Stick System" needs to be moved from Warranties to UNDERLAYMENTS
- **Solution**: Move "Full W.W Peel & Stick System" to be the first option in UNDERLAYMENTS section
- **Changes Required**:
  - Remove "Full W.W Peel & Stick System" from Warranties section
  - Add "Full W.W Peel & Stick System" as the first option in UNDERLAYMENTS accordion
  - Ensure proper material categorization logic
- **Files to Update**:
  - `src/components/estimates/warranties/WarrantySelector.tsx` - Remove peel stick from warranties
  - `src/components/estimates/materials/MaterialsSelectionTab.tsx` - Add to UNDERLAYMENTS section
  - Material categorization logic in material utils
- **Priority**: MEDIUM - Organization & UX

#### **Issue #4: Save Measurements Feedback Enhancement**
- **Problem**: Users don't get clear confirmation when measurements are saved
- **Current Issues**:
  - Toast messages don't appear on all screens  
  - No visual button feedback after successful save
- **Solution**: 
  - Ensure toast messages appear consistently across all screen sizes
  - Make "Save Measurements" button turn green after successful save
  - Add button state management (saving → success → reset)
  - Maintain existing functionality without breaking anything
- **Files to Update**:
  - `src/components/upload/PdfUploader.tsx` - "Save Measurements" button (Line 248)
  - `src/components/estimates/measurement/ReviewTab.tsx` - Button text and state (Line 142)
  - `src/components/estimates/measurement/MeasurementForm.tsx` - Save logic and toast handling
  - `src/hooks/useMeasurementStorage.ts` - Storage callback handling
- **Priority**: HIGH - User Feedback

#### **Issue #5: Navigation/Caching State Persistence**
- **Problem**: Estimate creation progress is lost when switching tabs
- **Impact**: Users (Jay, admins, managers) lose upload progress and data
- **Solution**: Implement proper state caching for estimate creation flow
- **Requirements**:
  - Preserve upload progress during tab navigation
  - Maintain form data across tab switches
  - Keep user's current view/state intact
- **Technical Approach**:
  - Implement localStorage or sessionStorage caching
  - Add state persistence hooks
  - Ensure data recovery on tab return
- **Files to Impact**:
  - Estimate creation flow components
  - Upload state management
  - Navigation routing
- **Priority**: CRITICAL - Data Loss Prevention

#### **Issue #6: JHagan Account Fix**
- **Problem**: JHagan account had null job title in Supabase
- **Solution**: ✅ MANUALLY FIXED - Set to "administrator"
- **Follow-up**: Test login functionality
- **Priority**: MEDIUM - Account Access

#### **Issue #7: SHINGLES Accordion Default Closed State**
- **Problem**: SHINGLES accordion is open by default when users reach Select Materials tab
- **Solution**: Set SHINGLES accordion to be closed by default for cleaner UX
- **Changes Required**:
  - Modify accordion default state to have SHINGLES section collapsed by default
  - Keep all material categories (SHINGLES, UNDERLAYMENTS, LOW_SLOPE, METAL, VENTILATION, ACCESSORIES) collapsed by default
  - Users can click to open any section they need
- **Files to Update**:
  - `src/components/estimates/materials/MaterialsSelectionTab.tsx` - Accordion default state
  - Material category accordion component logic
- **Priority**: LOW - UX Enhancement

#### **Issue #8: GAF Package Selection Redundancy Review**
- **Problem**: Redundancy between GAF1 Basic Package and GAF2 Premium Package selection and warranty options
- **Solution**: Review and streamline the GAF package + warranty selection flow
- **Investigation Required**:
  - Analyze current GAF package selection flow (two big squares at top)
  - Review warranty options section relationship to packages
  - Determine optimal user flow for package + warranty selection
- **Files to Review**:
  - `src/components/estimates/packages/GAFPackageSelector.tsx`
  - `src/components/estimates/warranties/WarrantySelector.tsx`
  - Package selection workflow logic
- **Priority**: LOW - UX Optimization

---

### **🚀 IMPLEMENTATION TIMELINE**

#### **Phase 1: Critical Functional Fixes (Day 1)**
1. **Input Field Typing Restrictions** (Issue #2) - 2 hours
2. **Save Measurements Feedback** (Issue #4) - 3 hours  
3. **Approve → Accepted Wording** (Issue #1) - 2 hours

#### **Phase 2: UX Improvements (Day 2)**
4. **Material Categories Reorganization** (Issue #3) - 3 hours
5. **SHINGLES Accordion Default Closed** (Issue #7) - 1 hour
6. **Navigation/Caching State Persistence** (Issue #5) - 4-6 hours

#### **Phase 3: Testing & Deployment (Day 3)**
7. **Comprehensive Testing** - All scenarios with Jay's account
8. **Production Deployment** - Release to admin users

#### **Future Considerations (Post-Release)**
- **GAF Package Selection Redundancy Review** (Issue #8) - For next sprint after user feedback

---

### **🧪 TESTING CHECKLIST**

#### **Pre-Deployment Testing Requirements:**
- [ ] **Input Fields**: Test all quantity inputs can accept multi-digit numbers
- [ ] **Button Feedback**: Verify "Save Measurements" turns green after save
- [ ] **Toast Messages**: Confirm toasts appear on all screen sizes
- [ ] **Wording Changes**: Verify all "Approve" text changed to "Accepted"
- [ ] **Material Categories**: Confirm "Full W.W Peel & Stick System" moved to first option in UNDERLAYMENTS section
- [ ] **SHINGLES Accordion**: Verify SHINGLES section is closed by default in Select Materials tab
- [ ] **State Persistence**: Test estimate creation flow maintains data across tab switches
- [ ] **Account Access**: Verify JHagan can login successfully
- [ ] **Regression Testing**: Ensure existing functionality still works (estimate creation, PDF upload, pricing calculations)

#### **User Acceptance Testing:**
- [ ] **Jay's Account**: Complete estimate creation flow from start to finish
- [ ] **Admin Functions**: Test all admin dashboard features
- [ ] **Manager Functions**: Test territory-based estimate approval workflow
- [ ] **Cross-Browser**: Test on Chrome, Safari, Edge (fix previous Edge issues)
- [ ] **Mobile/Tablet**: Verify responsive design works on various screen sizes

---

## 📋 **IMMEDIATE PRIORITY: Sales Rep Dashboard Redesign**

### **Critical Issue: Sales Rep Workflow Overhaul**
- **Problem**: Current Sales Rep dashboard is broken and not user-friendly
- **Territory Display Bug**: Showing "Territory a221805b... Territory" instead of "Winter Park Territory"
- **UI/UX Issues**: Generic dashboard design, not optimized for sales rep workflow
- **Workflow Complexity**: Current estimate creation flow is too complex for sales reps

### **🎯 Sales Rep Dashboard Vision**
**Target Users**: Sales representatives (project managers) like Taylor Hilton  
**Devices**: Desktop PC, mobile web browsers, iPad (responsive design)  
**Core Principle**: Simplified, intuitive workflow focused on estimate creation

### **📱 New Sales Rep Dashboard Design Requirements**

#### **Dashboard Layout (Creative & Functional)**
- **Hero Section**: Welcome message with rep name and territory (Winter Park)
- **Quick Actions**: Large, prominent "New Estimate" button
- **Progress Tracking**: Visual progress cards showing estimates in different stages
- **Territory Info**: Clean display of territory assignment and managers
- **Recent Activity**: Timeline of recent estimates and status updates
- **Mobile-First**: Responsive design that works seamlessly on all devices

#### **Simplified Estimate Workflow**
1. **Dashboard** → Click "New Estimate"
2. **Upload PDF** → Drag & drop EagleView PDF
3. **Parse & Review** → System parses measurements, rep reviews/confirms
4. **JWS Auto-populate** → Job Worksheet auto-fills from PDF data
5. **Complete JWS** → Rep fills in missing details (ventilation, accessories, etc.)
6. **Select Materials** → Auto-populated GAF 1/2 + JWS selections
7. **Submit for Approval** → Send to territory managers

#### **Key Features for Sales Reps**
- **No Price Visibility**: Reps cannot see material prices, only quantities and coverage rules
- **JWS Integration**: Seamless job worksheet experience with auto-population
- **GAF Package Selection**: Pre-configured GAF 1 and GAF 2 packages
- **Territory-Based**: All work tied to Winter Park territory with Chase/Adam as managers
- **Submission Workflow**: Clear submit → pending → approved/rejected status flow

### **🔧 Implementation Tasks**

#### **Phase 1: Fix Current Issues (Day 1)**
1. **Territory Display Fix** - Show "Winter Park Territory" instead of broken UUID
   - **Files**: `src/pages/SalesRepDashboard.tsx`, `src/contexts/AuthContext.tsx`
   - **Issue**: Territory name not being fetched/displayed properly
   - **Fix**: Query territories table properly and display territory name

2. **Dashboard Redesign** - Create modern, mobile-responsive Sales Rep dashboard
   - **Files**: `src/pages/SalesRepDashboard.tsx`, create new dashboard components
   - **New Components**: Hero section, quick actions, progress tracking
   - **Design**: Mobile-first, modern UI with better visual hierarchy

3. **Metrics Redesign** - Visual, engaging estimate progress cards
   - **Files**: `src/components/ui/MetricCard.tsx`, dashboard metric components
   - **Features**: Progress indicators, visual status cards, better UX

#### **Phase 2: Workflow Simplification (Day 2-3)**
4. **Estimate Workflow Redesign** - Implement simplified 7-step process
   - **Files**: `src/pages/Estimates.tsx`, estimate creation flow components
   - **New Flow**: Dashboard → Upload → Parse → Review → JWS → Materials → Submit
   - **Navigation**: Simplified step-by-step process for reps

5. **Hide Material Prices** - Remove price visibility for sales reps
   - **Files**: `src/components/estimates/materials/MaterialsSelectionTab.tsx`
   - **Files**: `src/components/estimates/materials/MaterialsSelectionTable.tsx`
   - **Logic**: Role-based price hiding, show only quantities and coverage rules

6. **JWS Enhancement** - Better job worksheet integration and auto-population
   - **Files**: `src/components/estimates/JobWorksheetTab.tsx`, `src/components/estimates/JobWorksheetForm.tsx`
   - **Features**: Auto-populate from PDF data, better form UX, seamless integration

#### **Phase 3: Integration & Testing (Day 4)**
7. **GAF Package Integration** - Connect GAF packages with JWS data
   - **Files**: `src/components/estimates/packages/GAFPackageSelector.tsx`
   - **Files**: `src/components/estimates/materials/MaterialsSelectionTab.tsx`
   - **Logic**: Auto-populate materials based on GAF package + JWS selections

8. **Mobile Responsive** - Ensure perfect experience on all devices
   - **Files**: All dashboard and estimate components
   - **Testing**: Desktop, mobile web, iPad responsiveness
   - **CSS**: Mobile-first responsive design improvements

9. **Submission Flow** - Implement rep → manager approval workflow
   - **Files**: `src/components/estimates/pricing/EstimateSummaryTab.tsx`
   - **Database**: Update submission status tracking
   - **UI**: Clear submit button and status indicators

10. **Comprehensive Testing** - Test on desktop, mobile, iPad
    - **Scope**: Complete Sales Rep workflow from login to estimate submission
    - **Browsers**: Chrome, Safari, Edge on all device types
    - **User**: Taylor Hilton account testing

### **📋 **Next Sprint: Enhancements & Polish**

### **Priority 1: Subtrade Workflow**
- **Objective**: Integrate subtrade pricing and management into the estimate process.
- **Tasks**:
  1.  **Meet with Subtrade Team**: Finalize the list of services and their pricing models.
  2.  **Subtrade Manager Role**: Create a new `subtrade_manager` role with a dedicated dashboard to view and price requested jobs.
  3.  **UI Integration**: Add a "Request Subtrade Pricing" button to the estimate creation flow.
  4.  **Notifications**: Implement real-time notifications to alert subtrade managers of new requests.

### **Priority 2: Client-Facing PDF Generation**
- **Objective**: Create a professional, customer-facing PDF proposal.
- **Tasks**:
  1.  **Finalize Marketing Template**: Incorporate the theme, colors, and terms provided by the marketing team.
  2.  **Implement PDF Generation**: Use a Supabase Edge Function to generate the PDF from the client-safe estimate data.
  3.  **"Download Proposal" Button**: Add a button to the estimate summary for managers and admins to download the final PDF.

### **Priority 3: Mobile Experience**
- **Objective**: Ensure a seamless experience for managers and admins on tablets and mobile devices.
- **Tasks**:
  1.  **Full Responsive Audit**: Test and refine all components on various screen sizes.
  2.  **Touch-Friendly UI**: Increase tap targets and ensure easy navigation on mobile.
  3.  **Performance Optimization**: Optimize image sizes and lazy-load components for faster mobile loading.

### **Priority 4: Testing & QA**
- **Objective**: Ensure the stability and reliability of the platform.
- **Tasks**:
  1.  **E2E Testing**: Create Playwright tests for the core admin and manager workflows (login → create estimate → approve).
  2.  **Unit Testing**: Add unit tests for critical business logic, such as the estimate calculation engine.

---

## 📝 **Footnote: Incomplete Features & Technical Debt**

### **🔥 High Priority Incomplete Items:**

#### **1. Bulk User Creation System**
- **Status**: Designed but not implemented
- **Description**: Excel → CSV → Supabase bulk upload for project managers
- **Files**: Need to create `bulk-create-project-managers.js`
- **Features**: Password generation, territory mapping, credentials export

#### **2. Document Library Functionality** 
- **Status**: UI exists but functions disabled
- **Files**: `src/pages/DocumentsLibrary.tsx` (Lines 318, 379, 386)
- **Missing**: Download buttons marked as `{/* TODO: Download */}`
- **Missing**: View PDF functionality incomplete

#### **3. SignNow/DocuSign Integration**
- **Status**: Button exists but shows "This feature will be available soon!"
- **Files**: `src/components/estimates/pricing/SalesRepSummaryTab.tsx` (Line 1110)
- **Missing**: Electronic signature workflow, contract generation pipeline

#### **4. Territories API Functions**
- **Status**: Stubbed out but not functional
- **Files**: `src/api/territories.ts` (Lines 25, 32, 39)
- **Missing**: Create, Update, Delete all marked as `TODO: Implement`

#### **5. Material Waste Percentage System**
- **Status**: Database exists but API disabled
- **Files**: `src/lib/supabase/material-waste.ts` (Lines 11, 35, 49)
- **Missing**: Caching system, all functions return null/false

### **⚠️ Medium Priority Incomplete Items:**

#### **6. Auto-Save System**
- **Status**: Currently DISABLED due to navigation bugs
- **Files**: `src/utils/feature-flags.ts` (Line 33)
- **Issue**: LocalStorage → Supabase migration incomplete
- **Missing**: Conflict resolution system

#### **7. Onboarding Flow**
- **Status**: Completely DISABLED 
- **Files**: `src/App.tsx` (Line 145)
- **Missing**: New user experience, role-based setup

#### **8. Real-Time Notifications**
- **Status**: Planned but not implemented
- **Missing**: In-app notification center, SendGrid integration, SMS alerts

#### **9. Mobile/Offline Mode**
- **Status**: Offline queue disabled
- **Files**: `src/utils/feature-flags.ts` (Line 40)
- **Missing**: Progressive Web App features, touch optimization

### **📋 Lower Priority Incomplete Items:**

#### **10. E2E Testing**
- **Status**: Tests exist but skipped due to bugs
- **Files**: `e2e/create-estimate.spec.ts` (Line 4)
- **Issue**: applyPresetBundle function bug causing test failures

#### **11. Subtrade Management**
- **Status**: Basic structure exists, limited functionality
- **Missing**: Pricing integration, manager dashboard

#### **12. Analytics & Monitoring**
- **Missing**: Sentry error tracking, APM, user behavior analytics

---

## 🎯 **Next Sprint Priorities:**

### **Week 1:**
1. ✅ **Bulk User Creation** (Priority for territory expansion)
2. 🔧 **Document Library Downloads** (2-3 hours)
3. 🔧 **Territories CRUD Functions** (1 day)
4. 🔧 **Material Waste API** (Half day)

### **Week 2:**
5. 📧 **SignNow Integration** (2-3 days)
6. 🔄 **Auto-Save System Re-enable** (1-2 days)  
7. 📱 **Mobile Optimization** (1 week)

### **Future Sprints:**
8. 🔔 **Real-Time Notifications**
9. 🏢 **Subtrade Management**
10. 📊 **Analytics Dashboard**

---

This README provides a clear overview of the current release, upcoming sprints, and unfinished functionality that requires future development.
# Environment variables updated for preview testing

## 🔌 **EagleView Integration Status**

## 🔌 **EagleView Integration Status**

### **Current Situation:**
- **Client ID (Original)**: `0oa15t1o04aRqUqcT2p8`
- **Client ID (Production)**: `0oa15t1zeu9YyvBKO2p8`
- **Integration Type**: Client Credentials flow (machine-to-machine)
- **API**: Measurement Orders API

### **Blocking Issue:**
- **Client Secret**: Not available until application is approved/live by EagleView
- **Status**: New production app shows "Request to go live" - awaiting approval
- **Impact**: Cannot authenticate with EagleView API until Client Secret is provided

### **Next Steps:**
1. **Request Go-Live**: Submit application for approval through EagleView developer portal
2. **Contact EagleView**: Email developer@eagleview.com for expedited approval
3. **Once Approved**: Client Secret will be available to generate/view in portal
4. **Update Environment**: Add `VITE_EAGLEVIEW_CLIENT_SECRET` to `.env` files

### **Required for Integration:**
```env
VITE_EAGLEVIEW_CLIENT_ID=0oa15t1zeu9YyvBKO2p8
VITE_EAGLEVIEW_CLIENT_SECRET=[Pending - Awaiting Go-Live Approval]
VITE_EAGLEVIEW_WEBHOOK_URL=https://xtdyirvhfyxmpexvjjcb.supabase.co/functions/v1/eagleview-webhook
``` 