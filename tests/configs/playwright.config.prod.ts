import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for testing against Vercel production deployment
 * This tests the actual working authentication system
 */
export default defineConfig({
  testDir: '../e2e/production',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // More retries for production testing
  workers: process.env.CI ? 1 : 2, // Limited workers for production
  reporter: 'html',
  
  use: {
    // Production Vercel URL
    baseURL: 'https://docsflow.app',
    
    // Longer timeouts for production
    actionTimeout: 30000,
    navigationTimeout: 60000,
    
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Production-specific settings
    ignoreHTTPSErrors: false,
    acceptDownloads: true,
  },

  // Configure projects for production testing
  projects: [
    {
      name: 'chromium-production',
      use: { 
        ...devices['Desktop Chrome'],
        // Production-specific Chrome settings
        launchOptions: {
          args: [
            '--disable-dev-shm-usage',
            '--no-sandbox'
          ]
        }
      },
    },
    {
      name: 'firefox-production',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'mobile-production',
      use: { ...devices['Pixel 5'] },
    }
  ],

  // No local dev server for production testing
  // Tests run against live Vercel deployment

  // Global test configuration  
  globalSetup: './global-setup.prod.ts',
  globalTeardown: './global-teardown.prod.ts',
});
