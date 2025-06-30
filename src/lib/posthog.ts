import posthog from 'posthog-js'

// Initialize PostHog
export const initPostHog = () => {
  if (typeof window !== 'undefined') {
    const postHogKey = import.meta.env.VITE_POSTHOG_KEY || 'phc_onikKktwt05KZvMIojBF1lAH6DqzqE6H6VjnBTkzVw1';
    
    posthog.init(postHogKey, {
      api_host: 'https://app.posthog.com',
      // Enable session replay to see what users do
      session_recording: {
        recordCrossOriginIframes: true,
        maskAllInputs: false, // Allow seeing form inputs (be careful with sensitive data)
      },
      // Capture all interactions
      autocapture: true,
      // Capture page views automatically
      capture_pageview: true,
      // Enhanced error tracking
      capture_dead_clicks: true,
      capture_performance: true,
      // Development settings
      loaded: (posthog) => {
        if (import.meta.env.DEV) {
          console.log('PostHog loaded for user analytics with key:', postHogKey);
          console.log('PostHog instance:', posthog);
        }
        // Test event to verify it's working
        posthog.capture('posthog_initialized', {
          timestamp: new Date().toISOString(),
          environment: import.meta.env.DEV ? 'development' : 'production'
        });
      }
    })
  }
}

// Track user actions
export const trackEvent = (event: string, properties?: Record<string, any>) => {
  if (typeof window !== 'undefined') {
    posthog.capture(event, properties)
  }
}

// Identify users (call after login)
export const identifyUser = (userId: string, properties?: Record<string, any>) => {
  if (typeof window !== 'undefined') {
    posthog.identify(userId, properties)
  }
}

// Track estimate creation specifically
export const trackEstimateCreated = (estimateData: {
  territory?: string
  packageType?: string
  estimateValue?: number
  userRole?: string
}) => {
  trackEvent('estimate_created', {
    territory: estimateData.territory,
    package_type: estimateData.packageType,
    estimate_value: estimateData.estimateValue,
    user_role: estimateData.userRole,
    timestamp: new Date().toISOString()
  })
}

// Track user login
export const trackUserLogin = (userEmail: string, userRole: string) => {
  identifyUser(userEmail, {
    email: userEmail,
    role: userRole,
    login_timestamp: new Date().toISOString()
  })
  trackEvent('user_login', {
    email: userEmail,
    role: userRole
  })
}

export default posthog 