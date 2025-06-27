import LogRocket from 'logrocket';

// Initialize LogRocket
export const initLogRocket = () => {
  if (typeof window !== 'undefined') {
    const appId = import.meta.env.VITE_LOGROCKET_APP_ID;
    
    // Skip initialization if no App ID is provided
    if (!appId || appId === 'your-app-id-here') {
      console.log('LogRocket: No App ID provided, skipping initialization');
      return;
    }
    
    // Initialize in production OR when development flag is enabled
    const shouldInitialize = import.meta.env.PROD || import.meta.env.VITE_ENABLE_LOGROCKET_DEV === 'true';
    
    if (!shouldInitialize) {
      console.log('LogRocket: Disabled in development. Set VITE_ENABLE_LOGROCKET_DEV=true to enable');
      return;
    }
    
    console.log('LogRocket: Initializing with App ID:', appId);
    
    LogRocket.init(appId, {
      // Capture all network requests
      network: {
        requestSanitizer: (request) => {
          // Sanitize sensitive data in requests
          if (request.headers && request.headers.authorization) {
            request.headers.authorization = '[REDACTED]';
          }
          return request;
        },
        responseSanitizer: (response) => {
          // Sanitize sensitive data in responses
          return response;
        }
      },
      
      // Console logging
      console: {
        shouldAggregateConsoleErrors: true,
      },
      
      // DOM capture settings
      dom: {
        inputSanitizer: true,
        textSanitizer: true,
      },
    });

    console.log('LogRocket: Successfully initialized and ready to record sessions');
  }
};

// Identify users when they log in
export const identifyUser = (userId: string, userInfo: {
  email?: string;
  role?: string;
  name?: string;
}) => {
  if (typeof window !== 'undefined') {
    LogRocket.identify(userId, {
      email: userInfo.email,
      role: userInfo.role,
      name: userInfo.name || userInfo.email,
    });
  }
};

// Track custom events
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (typeof window !== 'undefined') {
    LogRocket.track(eventName, properties);
  }
};

// Track estimate creation
export const trackEstimateCreated = (estimateData: {
  estimateId?: string;
  customerAddress?: string;
  totalPrice?: number;
  userRole?: string;
}) => {
  trackEvent('Estimate Created', {
    estimate_id: estimateData.estimateId,
    customer_address: estimateData.customerAddress,
    total_price: estimateData.totalPrice,
    user_role: estimateData.userRole,
  });
};

// Track estimate sold
export const trackEstimateSold = (estimateData: {
  estimateId: string;
  jobType: string;
  totalPrice?: number;
  insuranceCompany?: string;
}) => {
  trackEvent('Estimate Sold', {
    estimate_id: estimateData.estimateId,
    job_type: estimateData.jobType,
    total_price: estimateData.totalPrice,
    insurance_company: estimateData.insuranceCompany,
  });
};

// Capture errors manually
export const captureError = (error: Error, additionalInfo?: Record<string, any>) => {
  if (typeof window !== 'undefined') {
    LogRocket.captureException(error, {
      extra: additionalInfo,
    });
  }
};

// Get session URL for sharing
export const getSessionURL = (): Promise<string> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined') {
      LogRocket.getSessionURL((sessionURL) => {
        resolve(sessionURL);
      });
    } else {
      resolve('');
    }
  });
};

export default LogRocket; 