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
        
        // Track page load performance
        if (window.performance && window.performance.navigation) {
          const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
          trackPerformanceMetric('page_load_time', loadTime, {
            page: window.location.pathname,
            user_agent: navigator.userAgent
          });
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

// Enhanced analytics for admin actions
export const trackAdminEstimateAction = (action: 'approve' | 'reject' | 'delete', estimateData: {
  estimateId: string
  creatorRole?: string
  estimateValue?: number
  territory?: string
  reason?: string
}) => {
  trackEvent('admin_estimate_action', {
    action,
    estimate_id: estimateData.estimateId,
    creator_role: estimateData.creatorRole,
    estimate_value: estimateData.estimateValue,
    territory: estimateData.territory,
    rejection_reason: estimateData.reason,
    timestamp: new Date().toISOString()
  })
}

// Funnel tracking for conversion analysis
export const trackFunnelStep = (step: string, stepData?: Record<string, any>) => {
  trackEvent('funnel_step', {
    step,
    timestamp: new Date().toISOString(),
    ...stepData
  })
}

// Feature flag check (for A/B testing)
export const isFeatureEnabled = (featureName: string): boolean => {
  if (typeof window !== 'undefined') {
    return posthog.isFeatureEnabled(featureName) || false
  }
  return false
}

// Cohort identification for user segmentation
export const identifyUserCohort = (userId: string, cohortData: {
  role: string
  territory?: string
  signupDate?: string
  estimatesCreated?: number
  conversionRate?: number
}) => {
  if (typeof window !== 'undefined') {
    posthog.group('user_cohort', `${cohortData.role}_${cohortData.territory || 'unknown'}`, {
      role: cohortData.role,
      territory: cohortData.territory,
      signup_date: cohortData.signupDate,
      estimates_created: cohortData.estimatesCreated,
      conversion_rate: cohortData.conversionRate
    })
  }
}

// Performance monitoring for estimate workflow
export const trackPerformanceMetric = (metricName: string, value: number, additionalData?: Record<string, any>) => {
  trackEvent('performance_metric', {
    metric_name: metricName,
    metric_value: value,
    timestamp: new Date().toISOString(),
    ...additionalData
  })
}

// User behavior patterns for UX optimization
export const trackUserBehavior = (behaviorType: string, behaviorData: Record<string, any>) => {
  trackEvent('user_behavior', {
    behavior_type: behaviorType,
    timestamp: new Date().toISOString(),
    ...behaviorData
  })
}

// Enhanced business-focused tracking functions
export const trackBusinessEvent = (eventName: string, properties: Record<string, any> = {}) => {
  posthog?.capture(`business_${eventName}`, {
    timestamp: new Date().toISOString(),
    ...properties
  });
};

export const trackEstimateWorkflow = (step: string, properties: Record<string, any> = {}) => {
  posthog?.capture('estimate_workflow', {
    workflow_step: step,
    timestamp: new Date().toISOString(),
    ...properties
  });
};

export const trackRevenueEvent = (eventType: string, amount: number, properties: Record<string, any> = {}) => {
  posthog?.capture('revenue_event', {
    event_type: eventType, // 'estimate_created', 'estimate_sold', 'contract_signed'
    revenue_amount: amount,
    timestamp: new Date().toISOString(),
    ...properties
  });
};

export const trackUserProductivity = (action: string, timeSpent: number, properties: Record<string, any> = {}) => {
  posthog?.capture('user_productivity', {
    productivity_action: action,
    time_spent_seconds: timeSpent,
    efficiency_score: timeSpent < 300 ? 'high' : timeSpent < 600 ? 'medium' : 'low',
    timestamp: new Date().toISOString(),
    ...properties
  });
};

export const trackMaterialSelection = (materials: any[], properties: Record<string, any> = {}) => {
  posthog?.capture('material_selection', {
    materials_count: materials.length,
    material_types: materials.map(m => m.type || m.category),
    total_cost: materials.reduce((sum, m) => sum + (m.cost || 0), 0),
    timestamp: new Date().toISOString(),
    ...properties
  });
};

export const trackProfitMargin = (marginPercent: number, estimateValue: number, properties: Record<string, any> = {}) => {
  posthog?.capture('profit_margin_analysis', {
    margin_percentage: marginPercent,
    estimate_value: estimateValue,
    margin_category: marginPercent > 25 ? 'high' : marginPercent > 15 ? 'medium' : 'low',
    timestamp: new Date().toISOString(),
    ...properties
  });
};

export default posthog 