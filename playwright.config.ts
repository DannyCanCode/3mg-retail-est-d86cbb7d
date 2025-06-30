import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Enhanced reporting for user testing
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173', // Will be updated with your Netlify URL
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Enhanced for user testing
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  // Multiple browser testing for Jay and Tyler
  projects: [
    {
      name: 'Jay-Chrome',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        // Jay's admin setup
        userAgent: 'Jay-Admin-Chrome'
      },
    },
    {
      name: 'Tyler-Chrome', 
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        // Tyler's typical setup
        userAgent: 'Tyler-Admin-Chrome'
      },
    },
    {
      name: 'Mobile-Testing',
      use: { ...devices['iPhone 12'] },
    },
    // Concurrent testing project
    {
      name: 'Concurrent-Users',
      use: { 
        ...devices['Desktop Chrome'],
        // Allow multiple contexts
        permissions: ['clipboard-read', 'clipboard-write'],
      },
      testMatch: '**/concurrent-users.spec.ts',
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes for startup
  },
  // Global test configuration for user testing
  timeout: 60 * 1000, // 1 minute per test
  expect: {
    timeout: 10 * 1000, // 10 seconds for assertions
  },
  // Retry configuration for flaky user scenarios
  retries: process.env.CI ? 2 : 1,
  // Run tests in parallel workers
  workers: process.env.CI ? 1 : undefined,
}); 