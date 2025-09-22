import { test, expect } from '@playwright/test';

test.describe('Login API Debug Test', () => {
  
  test('should debug login API call', async ({ page }) => {
    // Listen to all network requests
    const apiCalls: any[] = [];
    
    page.on('response', async (response) => {
      if (response.url().includes('/api/auth/login')) {
        console.log('🔍 Login API Response:', {
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
        
        try {
          const responseBody = await response.json();
          console.log('🔍 Login API Response Body:', responseBody);
          apiCalls.push({ status: response.status(), body: responseBody });
        } catch (e) {
          console.log('🔍 Could not parse response body');
          apiCalls.push({ status: response.status(), body: 'unparseable' });
        }
      }
    });
    
    page.on('requestfailed', (request) => {
      if (request.url().includes('/api/auth/login')) {
        console.log('❌ Login API Request Failed:', request.failure()?.errorText);
      }
    });
    
    // Clear cookies
    await page.context().clearCookies();
    
    // Navigate to login
    await page.goto('/login');
    
    console.log('🔍 Page loaded, current URL:', page.url());
    
    // Check if login form exists
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    console.log('🔍 Form elements visible:', {
      email: await emailInput.isVisible(),
      password: await passwordInput.isVisible(), 
      submit: await submitButton.isVisible()
    });
    
    // Fill credentials
    await emailInput.fill('test1@example.com');
    await passwordInput.fill('Testing123?');
    
    console.log('🔍 Credentials filled, submitting form...');
    
    // Submit and wait for response
    await submitButton.click();
    
    // Wait for API call to complete
    await page.waitForTimeout(5000);
    
    console.log('🔍 After form submission:');
    console.log('  Current URL:', page.url());
    console.log('  API calls made:', apiCalls.length);
    
    // Check if any error messages are visible
    const errorElements = await page.locator('.error, .alert, [role="alert"], .text-red-500, .text-red-600').all();
    for (const element of errorElements) {
      const text = await element.textContent();
      if (text && text.trim()) {
        console.log('🚨 Error message found:', text.trim());
      }
    }
    
    // Check network tab for any errors
    const cookies = await page.context().cookies();
    console.log('🔍 Cookies after login attempt:', cookies.map(c => c.name));
    
    // Assertion - we should have at least attempted the API call
    expect(apiCalls.length).toBeGreaterThan(0);
    
    if (apiCalls.length > 0) {
      const lastCall = apiCalls[apiCalls.length - 1];
      console.log('🔍 Last API call result:', lastCall);
      
      if (lastCall.status !== 200) {
        console.log(`❌ Login API failed with status ${lastCall.status}`);
        console.log('Response:', lastCall.body);
      }
    }
  });
  
});
