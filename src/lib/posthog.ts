import posthog from 'posthog-js'

// Initialize PostHog
export const initPostHog = () => {
  if (typeof window !== 'undefined') {
    posthog.init(import.meta.env.VITE_POSTHOG_KEY || 'phc_test_key_for_development', {
      api_host: 'https://app.posthog.com',
      // Enable session replay to see what users do
      session_recording: {
        recordCrossOriginIframes: true,
      },
      // Capture all interactions
      autocapture: true,
      // Capture page views automatically
      capture_pageview: true,
      // Development settings
      loaded: (posthog) => {
        if (import.meta.env.DEV) {
          console.log('PostHog loaded for user analytics')
        }
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