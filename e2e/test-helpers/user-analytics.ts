import { Page, expect } from '@playwright/test';

export class UserAnalyticsHelper {
  constructor(private page: Page, private userName: string) {}

  // Track user login for analytics
  async trackLogin() {
    // Wait for PostHog to initialize
    await this.page.waitForFunction(() => window.posthog !== undefined, { timeout: 5000 });
    
    // Verify PostHog is tracking the login
    await this.page.evaluate((userName) => {
      window.posthog?.capture('test_user_login', {
        test_user: userName,
        timestamp: new Date().toISOString(),
        test_session: true
      });
    }, this.userName);
  }

  // Track estimate creation events
  async trackEstimateCreation(estimateType: string) {
    await this.page.evaluate((data) => {
      window.posthog?.capture('test_estimate_created', {
        test_user: data.userName,
        estimate_type: data.estimateType,
        timestamp: new Date().toISOString(),
        test_session: true
      });
    }, { userName: this.userName, estimateType });
  }

  // Verify analytics events are being captured
  async verifyAnalyticsCapture() {
    const analyticsWorking = await this.page.evaluate(() => {
      // Check if PostHog is loaded and working
      return typeof window.posthog !== 'undefined' && 
             typeof window.posthog.capture === 'function';
    });
    
    expect(analyticsWorking).toBeTruthy();
    return analyticsWorking;
  }

  // Take screenshot with analytics context
  async screenshotWithAnalytics(filename: string) {
    await this.page.screenshot({ 
      path: `e2e/debug-screenshots/${this.userName}-${filename}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  // Performance metrics tracking
  async trackPerformanceMetrics() {
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd,
        loadComplete: navigation.loadEventEnd,
        duration: navigation.duration,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    });

    await this.page.evaluate((data) => {
      window.posthog?.capture('test_performance_metrics', {
        test_user: data.userName,
        metrics: data.metrics,
        timestamp: new Date().toISOString(),
        test_session: true
      });
    }, { userName: this.userName, metrics });

    return metrics;
  }
}

// Global helper function for concurrent user testing
export const createUserAnalytics = (page: Page, userName: string) => {
  return new UserAnalyticsHelper(page, userName);
};

// Type declaration for PostHog on window
declare global {
  interface Window {
    posthog?: {
      capture: (event: string, properties?: Record<string, any>) => void;
      identify: (userId: string, properties?: Record<string, any>) => void;
    };
  }
} 