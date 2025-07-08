# 🔧 Environment Variables Setup

## PostHog Real Analytics Configuration

To enable real PostHog analytics (instead of mock data), add these to your `.env` file:

```bash
# PostHog Analytics Configuration
VITE_POSTHOG_KEY=phc_your_project_key_here
VITE_POSTHOG_PROJECT_ID=12345
VITE_POSTHOG_API_KEY=phx_your_personal_api_key_here
```

## How to Get These Values

1. **Create PostHog Account**: [https://app.posthog.com/signup](https://app.posthog.com/signup)
2. **Project API Key**: Settings → Project Settings → Project API Key  
3. **Project ID**: Found in your URL `app.posthog.com/project/{PROJECT_ID}`
4. **Personal API Key**: Settings → Personal API Keys → Create new key

## Quick Setup Steps

1. Copy the variables above to your `.env` file
2. Replace the placeholder values with your real PostHog keys
3. Restart your development server
4. Go to Admin Dashboard → PostHog Analytics
5. Look for **🔗 Live PostHog API** badge (instead of **📊 Mock Data**)

## Verification

✅ **Working**: You see the green "🔗 Live PostHog API" badge  
❌ **Not Working**: You see the amber "📊 Mock Data" badge

Check browser console for any API connection errors. 

## Debug Logging

### Enabling Verbose Console Logs

By default, the application reduces console logging in production to improve performance. To enable detailed logging for troubleshooting:

#### Method 1: localStorage Flag
```javascript
// In browser console, run:
localStorage.setItem('debug_auto_save', 'true')

// To disable:
localStorage.removeItem('debug_auto_save')
```

#### Method 2: Development Mode
Verbose logging is automatically enabled when running in development mode (`npm run dev`).

### What Debug Logging Shows

When enabled, you'll see detailed logs for:
- Auto-save operations and hydration
- PDF data extraction and processing  
- Tab navigation and state changes
- Material calculations and updates
- Database operations

### Performance Note

Debug logging can generate hundreds of console messages. Only enable when actively troubleshooting issues, and disable afterward for better performance. 