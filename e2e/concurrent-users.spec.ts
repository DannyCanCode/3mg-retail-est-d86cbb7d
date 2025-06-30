import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { createUserAnalytics } from './test-helpers/user-analytics';

test.describe('Concurrent Multi-User Testing', () => {
  let browser: Browser;
  let jayContext: BrowserContext;
  let tylerContext: BrowserContext;
  let jayPage: Page;
  let tylerPage: Page;

  test.beforeAll(async ({ browser: testBrowser }) => {
    browser = testBrowser;
    
    // Create separate browser contexts for Jay and Tyler
    // This simulates completely separate admin user sessions
    jayContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Jay-Admin-Chrome'  
    });
    
    tylerContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Tyler-Admin-Chrome'
    });
    
    jayPage = await jayContext.newPage();
    tylerPage = await tylerContext.newPage();
  });

  test.afterAll(async () => {
    await jayContext?.close();
    await tylerContext?.close();
  });

  test('Jay and Tyler can work simultaneously without conflicts', async () => {
    // Initialize analytics helpers for both users
    const jayAnalytics = createUserAnalytics(jayPage, 'Jay');
    const tylerAnalytics = createUserAnalytics(tylerPage, 'Tyler');

    // Both users navigate to the app simultaneously
    const navigatePromises = Promise.all([
      jayPage.goto('http://localhost:5173'),
      tylerPage.goto('http://localhost:5173')
    ]);
    await navigatePromises;

    // Verify both pages loaded correctly
    await expect(jayPage).toHaveTitle(/3MG Retail Estimator/);
    await expect(tylerPage).toHaveTitle(/3MG Retail Estimator/);

    // Verify analytics are working on both pages
    await Promise.all([
      jayAnalytics.verifyAnalyticsCapture(),
      tylerAnalytics.verifyAnalyticsCapture()
    ]);

    // Track performance metrics
    const performancePromises = Promise.all([
      jayAnalytics.trackPerformanceMetrics(),
      tylerAnalytics.trackPerformanceMetrics()
    ]);
    const [jayMetrics, tylerMetrics] = await performancePromises;

    console.log('Jay Performance:', jayMetrics);
    console.log('Tyler Performance:', tylerMetrics);

    // Both users attempt to log in simultaneously
    // Jay logs in as admin
    const jayLoginPromise = jayPage.getByRole('button', { name: 'Sign In' }).click();
    
    // Tyler logs in as admin (slight delay to test race conditions)
    await tylerPage.waitForTimeout(100);
    const tylerLoginPromise = tylerPage.getByRole('button', { name: 'Sign In' }).click();
    
    await Promise.all([jayLoginPromise, tylerLoginPromise]);

    // Track login events
    await Promise.all([
      jayAnalytics.trackLogin(),
      tylerAnalytics.trackLogin()
    ]);

    // Both should reach admin dashboards
    await expect(jayPage.getByText('Admin Dashboard')).toBeVisible({ timeout: 10000 });
    await expect(tylerPage.getByText('Admin Dashboard')).toBeVisible({ timeout: 10000 });

    // Both users create estimates simultaneously
    const createEstimatePromises = Promise.all([
      jayPage.getByRole('button', { name: 'New Estimate' }).click(),
      tylerPage.getByRole('button', { name: 'New Estimate' }).click()
    ]);
    await createEstimatePromises;

    // Track estimate creation
    await Promise.all([
      jayAnalytics.trackEstimateCreation('concurrent-test'),
      tylerAnalytics.trackEstimateCreation('concurrent-test')
    ]);

    // Verify both are on the estimates page
    await expect(jayPage).toHaveURL(/.*\/estimates/);
    await expect(tylerPage).toHaveURL(/.*\/estimates/);

    // Take analytics-enhanced screenshots
    await Promise.all([
      jayAnalytics.screenshotWithAnalytics('concurrent-test'),
      tylerAnalytics.screenshotWithAnalytics('concurrent-test')
    ]);
  });

  test('Database consistency during concurrent estimate creation', async () => {
    // Both users upload PDFs simultaneously to test database locking
    const fileUploadPromises = Promise.all([
      simulateEstimateCreation(jayPage, 'Jay Admin'),
      simulateEstimateCreation(tylerPage, 'Tyler Admin')
    ]);
    
    await fileUploadPromises;

    // Both should have successfully created estimates
    await expect(jayPage.getByText('PDF processed successfully')).toBeVisible({ timeout: 15000 });
    await expect(tylerPage.getByText('PDF processed successfully')).toBeVisible({ timeout: 15000 });
  });

  test('Session isolation - logout one user does not affect the other', async () => {
    // Jay logs out
    await jayPage.getByRole('button', { name: 'Logout' }).click();
    await expect(jayPage.getByRole('button', { name: 'Sign In' })).toBeVisible();

    // Tyler should still be logged in and functional
    await expect(tylerPage.getByText('Admin Dashboard')).toBeVisible();
    await tylerPage.getByRole('button', { name: 'New Estimate' }).click();
    await expect(tylerPage).toHaveURL(/.*\/estimates/);
  });

  // Helper function to simulate complete estimate creation
  async function simulateEstimateCreation(page: Page, userType: string) {
    try {
      // Upload PDF
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: 'Browse Files' }).click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles('e2e/fixtures/sample-eagleview.pdf');
      
      // Wait for processing
      await expect(page.getByRole('heading', { name: 'PDF processed successfully' })).toBeVisible({ timeout: 15000 });
      
      // Save measurements
      await page.getByRole('button', { name: 'Save Measurements' }).click();
      
      // Take screenshot at key points
      await page.screenshot({ 
        path: `e2e/debug-screenshots/${userType.toLowerCase().replace(' ', '-')}-estimate-created.png` 
      });
      
    } catch (error) {
      console.error(`Error in ${userType} estimate creation:`, error);
      throw error;
    }
  }
});

// Performance testing for concurrent load
test.describe('Performance Under Load', () => {
  test('System handles 5 concurrent estimate creations', async ({ browser }) => {
    const contexts = await Promise.all(
      Array.from({ length: 5 }, (_, i) => 
        browser.newContext({ 
          userAgent: `LoadTest-User-${i + 1}` 
        })
      )
    );
    
    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    );

    try {
      // All users navigate simultaneously
      await Promise.all(
        pages.map(page => page.goto('http://localhost:5173'))
      );

      // Measure performance
      const startTime = Date.now();
      
      // All create estimates simultaneously
      await Promise.all(
        pages.map((page, index) => 
          simulateQuickEstimate(page, `LoadTestUser${index + 1}`)
        )
      );
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      console.log(`5 concurrent estimates completed in ${totalTime}ms`);
      expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds
      
    } finally {
      await Promise.all(contexts.map(context => context.close()));
    }
  });

  async function simulateQuickEstimate(page: Page, userName: string) {
    await page.getByRole('button', { name: 'New Estimate' }).click();
    await page.screenshot({ 
      path: `e2e/debug-screenshots/load-test-${userName}.png` 
    });
  }
}); 