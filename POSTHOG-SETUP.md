# 🚀 PostHog Real Analytics Setup Guide

## 📋 Overview

Your 3MG Retail Estimator now supports **real PostHog analytics** instead of mock data! This guide will help you connect to live data and understand all the features.

## 🔧 Setup Instructions

### 1. **PostHog Account Setup**

1. **Create PostHog Account**: Go to [PostHog Cloud](https://app.posthog.com/signup) or use your existing account
2. **Get Your Project Details**:
   - Navigate to **Settings** → **Project Settings**
   - Copy your **Project API Key** 
   - Copy your **Project ID** (found in the URL: `app.posthog.com/project/{PROJECT_ID}`)

### 2. **Environment Variables Setup**

Add these variables to your `.env` file:

```bash
# PostHog Configuration
VITE_POSTHOG_KEY=phc_your_project_key_here
VITE_POSTHOG_PROJECT_ID=12345
VITE_POSTHOG_API_KEY=phx_your_personal_api_key_here
```

**How to get these values:**

- **`VITE_POSTHOG_KEY`**: Project Settings → Project API Key
- **`VITE_POSTHOG_PROJECT_ID`**: Found in your PostHog URL 
- **`VITE_POSTHOG_API_KEY`**: Personal API Key from Settings → Personal API Keys

### 3. **Verification**

1. Restart your development server
2. Go to Admin Dashboard → PostHog Analytics
3. Look for the **🔗 Live PostHog API** badge (instead of **📊 Mock Data**)

---

## 📊 **What You'll Get with Real Data**

### **Current Metrics Being Tracked**

✅ **Page Load Times** - Automatic tracking of page performance  
✅ **API Response Times** - All Supabase/API calls measured  
✅ **PDF Processing Time** - EagleView PDF parsing duration  
✅ **Error Rates** - JavaScript errors and failed requests  
✅ **User Sessions** - Session duration and activity  
✅ **Conversion Funnels** - Complete user journey tracking  
✅ **User Cohorts** - Segmentation by role (admin/manager/rep)  
✅ **Feature Flags** - A/B testing capabilities  

### **Tracked Events**

```typescript
// Automatically tracked events in your app:
'posthog_initialized'      // PostHog setup
'user_login'               // User authentication
'estimate_created'         // New estimate
'pdf_uploaded'             // File upload
'measurements_completed'   // Measurement step
'materials_selected'       // Materials choice
'pricing_completed'        // Pricing finalized
'estimate_approved'        // Admin approval
'estimate_sold'           // Sale completed
'admin_estimate_action'   // Admin actions (approve/reject/delete)
'performance_metric'      // Performance data
'funnel_step'            // User journey steps
'user_behavior'          // General user actions
```

---

## 🎯 **Understanding Key Features**

### **1. A/B Testing & Feature Flags**

**What they are**: Feature flags let you enable/disable features for specific users or groups without deploying new code.

**How to use**:
1. In PostHog dashboard, go to **Feature Flags**
2. Create a new flag (e.g., `new_estimate_ui`)
3. Set rollout percentage (e.g., 50% of users get the new UI)
4. In your code, check: `isFeatureEnabled('new_estimate_ui')`

**"Test A/B Feature" Button**: Tests if the `new_estimate_ui` flag is enabled for the current user.

### **2. User Cohorts**

**What they are**: User groups based on behavior, properties, or actions.

**Current Cohorts**:
- **Admin Users**: Role-based segmentation
- **Territory Managers**: Regional performance tracking  
- **Sales Reps**: Individual performance metrics

**How they work**:
- Users are automatically grouped by their role
- Tracks retention rates, estimate counts, conversion rates
- Shows performance across different user types

**"Update Cohorts" Button**: Refreshes cohort data and identifies the current user's cohort in PostHog.

### **3. Conversion Funnel**

**What it tracks**: The complete user journey from PDF upload to sale:

```
PDF Upload → Measurements → Materials → Pricing → Estimate → Approved → Sold
```

**Real metrics you'll see**:
- How many users drop off at each step
- Conversion rates between steps
- Where to focus optimization efforts

### **4. Performance Monitoring**

**Real metrics tracked**:
- **Page Load Time**: How fast pages load for users
- **API Response Time**: Database/Supabase query speed
- **Error Rate**: Percentage of failed requests/errors
- **PDF Processing**: Time to parse EagleView PDFs

---

## 🔍 **Using Real Analytics Data**

### **Admin Dashboard Analytics**

Once connected, you'll see:

1. **Real Event Counts**: Actual user interactions, not mock data
2. **True Performance Metrics**: Real page load times and error rates  
3. **Actual User Behavior**: Real conversion rates and session durations
4. **Live Funnel Data**: Real drop-off points in your estimate flow
5. **Cohort Performance**: How different user roles actually perform

### **Business Insights You Can Get**

- **Which step loses the most users** in the estimate process
- **Performance bottlenecks** (slow pages, API calls)
- **User retention by role** (admin vs manager vs rep)
- **Peak usage times** and user activity patterns
- **Error tracking** to identify bugs quickly

### **Making Data-Driven Decisions**

1. **Low conversion at Materials step?** → Simplify material selection UI
2. **High PDF processing times?** → Optimize parsing algorithms  
3. **Sales reps have low retention?** → Improve onboarding/training
4. **Page load times too high?** → Performance optimization needed

---

## 🚀 **Advanced Features**

### **Custom Event Tracking**

Add custom tracking anywhere in your app:

```typescript
import { trackEvent, trackPerformanceMetric } from '@/lib/posthog';

// Track custom business events
trackEvent('pricing_template_used', {
  template_name: 'GAF Standard',
  user_role: 'rep',
  territory: 'South Florida'
});

// Track performance metrics
const startTime = performance.now();
// ... do some operation
const duration = performance.now() - startTime;
trackPerformanceMetric('estimate_calculation_time', duration);
```

### **User Identification**

When users log in, they're automatically identified:

```typescript
// Automatically called on login
trackUserLogin(userEmail, userRole);
identifyUser(userEmail, {
  role: userRole,
  territory: userTerritory,
  signup_date: userSignupDate
});
```

### **Cohort Analysis Setup**

```typescript
// Update user cohort data
identifyUserCohort(userId, {
  role: 'admin',
  territory: 'corporate', 
  signupDate: '2024-01-01',
  estimatesCreated: 25,
  conversionRate: 85.2
});
```

---

## 🛠 **Troubleshooting**

### **"Mock Data" Badge Still Showing**

1. ✅ Check environment variables are set correctly
2. ✅ Restart development server after adding env vars  
3. ✅ Verify PostHog API key has proper permissions
4. ✅ Check browser console for API errors

### **No Data in PostHog Dashboard**

1. ✅ Ensure events are being sent (check browser Network tab)
2. ✅ Verify PostHog project ID matches your account
3. ✅ Check PostHog account event ingestion (may take 1-2 minutes)

### **Performance Metrics Not Appearing**

1. ✅ Use the app normally (upload PDFs, create estimates)  
2. ✅ Wait 5-10 minutes for data processing
3. ✅ Refresh the analytics dashboard

---

## 📈 **Next Steps**

1. **Set up your PostHog account** and get API keys
2. **Add environment variables** and restart your server
3. **Test the connection** by creating estimates and checking analytics
4. **Create feature flags** for A/B testing new features
5. **Set up alerts** in PostHog for critical metrics (error rates, conversion drops)
6. **Use insights** to optimize your estimate workflow

---

## 💡 **Pro Tips**

- **Monitor the funnel daily** to catch conversion issues early
- **Set up PostHog alerts** for error rates > 2% or conversion drops > 10%
- **Use cohort analysis** to compare admin vs rep performance
- **A/B test UI changes** before rolling out to all users
- **Track custom business metrics** specific to roofing estimates

---

**🎉 You're now ready for real analytics!** Your 3MG Retail Estimator will provide genuine insights into user behavior, performance bottlenecks, and business optimization opportunities. 