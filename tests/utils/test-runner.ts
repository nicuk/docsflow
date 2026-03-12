/**
 * Comprehensive Test Runner for DocsFlow.app
 * 
 * This script provides utilities for running and managing Playwright tests
 * for chat functionality, document upload, and remember me authentication.
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

export interface TestConfig {
  baseUrl: string;
  testUser: {
    email: string;
    password: string;
  };
  timeouts: {
    navigation: number;
    apiResponse: number;
    upload: number;
    authentication: number;
  };
}

export const defaultTestConfig: TestConfig = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  testUser: {
    email: process.env.TEST_EMAIL || 'test1@example.com',
    password: process.env.TEST_PASSWORD || 'test-password'
  },
  timeouts: {
    navigation: 10000,
    apiResponse: 15000,
    upload: 30000,
    authentication: 8000
  }
};

/**
 * Test Utilities
 */
export class TestUtils {
  
  /**
   * Set up authenticated session for tests
   */
  static async setupAuth(page: Page, config = defaultTestConfig, rememberMe = false): Promise<boolean> {
    try {
      // Clear any existing state
      await page.context().clearCookies();
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      // Navigate to login
      await page.goto('/login', { waitUntil: 'networkidle' });
      
      // Fill credentials
      await page.fill('input[type="email"]', config.testUser.email);
      await page.fill('input[type="password"]', config.testUser.password);
      
      // Handle remember me
      const rememberCheckbox = page.locator('input[type="checkbox"]#remember');
      if (await rememberCheckbox.isVisible()) {
        if (rememberMe) {
          await rememberCheckbox.check();
        } else {
          await rememberCheckbox.uncheck();
        }
      }
      
      // Submit login
      await page.click('button[type="submit"]');
      
      // Wait for authentication
      await page.waitForTimeout(config.timeouts.authentication);
      
      // Verify authentication
      return await this.isAuthenticated(page);
      
    } catch (error) {
      console.error('Authentication setup failed:', error);
      return false;
    }
  }
  
  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(page: Page): Promise<boolean> {
    try {
      // Check for authentication indicators
      const indicators = [
        page.locator('textarea'), // Chat interface
        page.locator('text=dashboard', { hasText: /dashboard/i }),
        page.locator('button').filter({ hasText: /logout|sign out/i }),
        page.locator('[data-testid*="authenticated"]')
      ];
      
      for (const indicator of indicators) {
        if (await indicator.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          return true;
        }
      }
      
      // Check URL patterns
      const url = page.url();
      const authUrls = ['/dashboard', '/chat', '/documents'];
      return authUrls.some(authUrl => url.includes(authUrl));
      
    } catch {
      return false;
    }
  }
  
  /**
   * Wait for element with custom timeout
   */
  static async waitForElement(page: Page, selector: string, timeout = 10000): Promise<boolean> {
    try {
      await page.waitForSelector(selector, { timeout });
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Upload file helper
   */
  static async uploadFile(page: Page, filePath: string, uploadButton?: string): Promise<boolean> {
    try {
      const buttonSelector = uploadButton || 'button:has-text("upload")';
      const button = page.locator(buttonSelector).first();
      
      if (!(await button.isVisible())) {
        return false;
      }
      
      const fileChooserPromise = page.waitForEvent('filechooser');
      await button.click();
      const fileChooser = await fileChooserPromise;
      
      await fileChooser.setFiles([filePath]);
      
      // Wait for upload to process
      await page.waitForTimeout(5000);
      
      return true;
    } catch (error) {
      console.error('File upload failed:', error);
      return false;
    }
  }
  
  /**
   * Send chat message helper
   */
  static async sendChatMessage(page: Page, message: string): Promise<boolean> {
    try {
      const chatInput = page.locator('textarea').first();
      const sendButton = page.locator('button').filter({ hasText: /send/i }).first();
      
      if (!(await chatInput.isVisible()) || !(await sendButton.isVisible())) {
        return false;
      }
      
      await chatInput.fill(message);
      await sendButton.click();
      
      // Wait for message to appear
      await page.waitForTimeout(2000);
      
      return await page.locator(`text=${message}`).isVisible();
    } catch (error) {
      console.error('Send message failed:', error);
      return false;
    }
  }
  
  /**
   * Check for API errors
   */
  static async checkForApiErrors(page: Page): Promise<string[]> {
    const errors: string[] = [];
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Check for error messages in UI
    const errorSelectors = [
      'text=error',
      'text=failed',
      '[class*="error"]',
      '[data-testid*="error"]'
    ];
    
    for (const selector of errorSelectors) {
      const errorElement = page.locator(selector).first();
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent();
        if (errorText) {
          errors.push(errorText);
        }
      }
    }
    
    return errors;
  }
  
  /**
   * Take screenshot for debugging
   */
  static async captureDebugScreenshot(page: Page, testName: string): Promise<void> {
    try {
      await page.screenshot({
        path: `test-results/debug-${testName}-${Date.now()}.png`,
        fullPage: true
      });
    } catch (error) {
      console.error('Screenshot capture failed:', error);
    }
  }
  
  /**
   * Wait for AI response in chat
   */
  static async waitForAiResponse(page: Page, timeout = 15000): Promise<boolean> {
    try {
      // Wait for loading indicator to disappear
      await page.waitForSelector('[data-testid*="loading"], .loading', { 
        state: 'hidden', 
        timeout: timeout / 2 
      }).catch(() => {});
      
      // Wait for AI response
      const responseSelectors = [
        '[data-testid*="ai-response"]',
        '.ai-message',
        '.bot-message',
        '[class*="ai-response"]'
      ];
      
      for (const selector of responseSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: timeout / responseSelectors.length });
          return true;
        } catch {
          continue;
        }
      }
      
      return false;
    } catch {
      return false;
    }
  }
  
  /**
   * Clean up test data
   */
  static async cleanup(page: Page): Promise<void> {
    try {
      // Clear cookies and storage
      await page.context().clearCookies();
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}

/**
 * Test Report Generator
 */
export class TestReporter {
  private results: any[] = [];
  
  addResult(testName: string, status: 'passed' | 'failed' | 'skipped', details?: any) {
    this.results.push({
      testName,
      status,
      details,
      timestamp: new Date().toISOString()
    });
  }
  
  generateReport(): string {
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;
    
    let report = `
DocsFlow.app Test Report
========================
Generated: ${new Date().toISOString()}

Summary:
- Total Tests: ${this.results.length}
- Passed: ${passed}
- Failed: ${failed}  
- Skipped: ${skipped}
- Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%

Test Results:
`;
    
    this.results.forEach(result => {
      report += `\n${result.status.toUpperCase()}: ${result.testName}`;
      if (result.details) {
        report += `\n  Details: ${JSON.stringify(result.details, null, 2)}`;
      }
    });
    
    return report;
  }
  
  saveReport(filename: string = 'test-report.txt'): void {
    const report = this.generateReport();
    require('fs').writeFileSync(`test-results/${filename}`, report);
  }
}

/**
 * Environment Setup
 */
export class TestEnvironment {
  
  static async checkPrerequisites(): Promise<{ ready: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      issues.push('NEXT_PUBLIC_SUPABASE_URL not set');
    }
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      issues.push('NEXT_PUBLIC_SUPABASE_ANON_KEY not set');
    }
    
    // Check test fixtures
    const fixtures = [
      'tests/fixtures/test-document.txt',
      'tests/fixtures/test.pdf',
      'tests/fixtures/test.txt'
    ];
    
    for (const fixture of fixtures) {
      try {
        require('fs').accessSync(fixture);
      } catch {
        issues.push(`Test fixture missing: ${fixture}`);
      }
    }
    
    return {
      ready: issues.length === 0,
      issues
    };
  }
  
  static async setupTestData(): Promise<void> {
    // Create test results directory
    const fs = require('fs');
    if (!fs.existsSync('test-results')) {
      fs.mkdirSync('test-results', { recursive: true });
    }
  }
}

// Export test configuration for use in test files
export { test, expect, Page, BrowserContext };
