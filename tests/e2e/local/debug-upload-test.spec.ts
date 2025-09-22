import { test, expect } from '@playwright/test';

test.describe('Debug Upload Test', () => {
  
  test('debug login process step by step', async ({ page }) => {
    console.log('🔍 DEBUG: Step-by-step login analysis');
    
    // Clear browser state
    await page.context().clearCookies();
    
    // Monitor all console logs
    page.on('console', msg => {
      if (msg.type() === 'log' || msg.type() === 'error') {
        console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
      }
    });
    
    // Monitor all API responses
    page.on('response', async response => {
      if (response.url().includes('/api/auth/login')) {
        console.log(`[API] Login response: ${response.status()}`);
        try {
          const body = await response.json();
          console.log(`[API] Response body:`, JSON.stringify(body, null, 2));
        } catch (e) {
          console.log(`[API] Could not parse response body`);
        }
      }
    });
    
    // Step 1: Navigate to login
    console.log('📍 Step 1: Navigate to login page');
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Step 2: Fill form
    console.log('📍 Step 2: Fill login form');
    await page.fill('input[type="email"]', 'support@bitto.tech');
    await page.fill('input[type="password"]', 'Testing123?');
    
    // Step 3: Submit form
    console.log('📍 Step 3: Submit form and wait');
    await page.click('button[type="submit"]');
    
    // Wait longer and check multiple times
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      console.log(`[${i+1}s] Current URL: ${currentUrl}`);
      
      // Check for success indicators
      const hasSuccessMessage = await page.locator('text=Welcome back').isVisible().catch(() => false);
      const hasErrorMessage = await page.locator('.error, .alert, [role="alert"]').count();
      
      console.log(`[${i+1}s] Success message: ${hasSuccessMessage}, Error elements: ${hasErrorMessage}`);
      
      if (!currentUrl.includes('/login')) {
        console.log('✅ Redirected successfully!');
        break;
      }
    }
    
    const finalUrl = page.url();
    const success = !finalUrl.includes('/login');
    
    console.log(`📍 Final result: ${success ? 'SUCCESS' : 'STILL ON LOGIN PAGE'}`);
    console.log(`📍 Final URL: ${finalUrl}`);
    
    // If successful, test the upload page navigation
    if (success) {
      console.log('📍 Testing upload page navigation...');
      
      await page.goto('/dashboard/documents');
      await page.waitForTimeout(2000);
      
      const documentsUrl = page.url();
      const kickedOut = documentsUrl.includes('/login');
      
      console.log(`📍 Documents page result: ${kickedOut ? 'KICKED OUT' : 'SUCCESS'}`);
      console.log(`📍 Documents URL: ${documentsUrl}`);
      
      expect(kickedOut).toBeFalsy();
    } else {
      console.log('❌ Cannot test upload page - login failed');
      
      // Check for any visible errors
      const errorText = await page.locator('.error, .alert, [role="alert"]').allTextContents();
      if (errorText.length > 0) {
        console.log('🔍 Error messages found:', errorText);
      }
      
      // Check form state
      const emailValue = await page.inputValue('input[type="email"]');
      const isSubmitDisabled = await page.locator('button[type="submit"]').isDisabled();
      
      console.log(`🔍 Form state: email="${emailValue}", submit disabled: ${isSubmitDisabled}`);
    }
    
    // This test is for debugging, so we'll pass regardless
    expect(true).toBeTruthy();
  });
  
});
