/**
 * TEST: Surgical SSR Auth Fix
 * 
 * This tests if our surgical fixes properly establish auth.uid() context for RLS policies.
 * We removed service role bypasses and implemented proper Supabase SSR patterns.
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const TEST_CREDENTIALS = {
  email: 'support@bitto.tech',
  password: 'Testing123?'
};

async function testSurgicalAuthFix() {
  console.log('🧪 TESTING: Surgical SSR Auth Fix');
  console.log('==========================================');
  
  const browser = await chromium.launch({ 
    headless: false, // Show browser for visual confirmation
    slowMo: 1000 // Slow down actions to see what's happening
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('\n📋 STEP 1: Navigate to login page');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    console.log('\n📋 STEP 2: Fill in credentials');
    await page.fill('[name="email"], [type="email"], #email', TEST_CREDENTIALS.email);
    await page.fill('[name="password"], [type="password"], #password', TEST_CREDENTIALS.password);
    
    console.log('\n📋 STEP 3: Submit login form');
    // Try multiple possible selectors for the login button
    const loginButton = await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In"), .login-button').first();
    
    // Listen for network requests to see API responses
    page.on('response', async (response) => {
      if (response.url().includes('/api/auth/login')) {
        const status = response.status();
        console.log(`🌐 Login API Response: ${status}`);
        
        if (status === 200) {
          try {
            const body = await response.text();
            const json = JSON.parse(body);
            console.log('✅ Login API Success:', {
              success: json.success,
              userEmail: json.user?.email,
              tenantId: json.user?.tenant_id?.substring(0, 8) + '...',
              hasSession: !!json.session
            });
          } catch (e) {
            console.log('✅ Login API Success (couldn\'t parse body)');
          }
        } else {
          try {
            const body = await response.text();
            console.log('❌ Login API Error:', body);
          } catch (e) {
            console.log(`❌ Login API Error: ${status}`);
          }
        }
      }
    });
    
    await loginButton.click();
    
    console.log('\n📋 STEP 4: Wait for redirect or error');
    
    // Wait for either success redirect or error message
    try {
      // Wait for either a redirect to dashboard or an error to appear
      await Promise.race([
        page.waitForURL('**/dashboard**', { timeout: 10000 }),
        page.waitForSelector('.error, [role="alert"], .alert-error', { timeout: 10000 }),
        page.waitForFunction(() => 
          document.body.textContent.includes('User profile not found') ||
          document.body.textContent.includes('Invalid email') ||
          document.body.textContent.includes('Error') ||
          window.location.pathname.includes('dashboard')
        , { timeout: 10000 })
      ]);
      
      const currentUrl = page.url();
      console.log(`📍 Current URL after login: ${currentUrl}`);
      
      if (currentUrl.includes('dashboard')) {
        console.log('🎉 SUCCESS: Redirected to dashboard - Auth flow working!');
        
        console.log('\n📋 STEP 5: Test authenticated API call');
        
        // Test an authenticated API call to verify RLS context
        const response = await page.evaluate(async () => {
          const res = await fetch('/api/conversations', {
            method: 'GET',
            credentials: 'include'
          });
          return {
            status: res.status,
            ok: res.ok,
            body: res.ok ? await res.text() : await res.text()
          };
        });
        
        console.log('🔐 Authenticated API Test:', response);
        
      } else {
        // Check for error messages
        const bodyText = await page.textContent('body');
        if (bodyText.includes('User profile not found')) {
          console.log('❌ STILL FAILING: "User profile not found" - RLS issue persists');
        } else if (bodyText.includes('Invalid email')) {
          console.log('❌ AUTHENTICATION FAILED: Invalid credentials');
        } else {
          console.log('❌ UNKNOWN ERROR: Login didn\'t redirect to dashboard');
          console.log('Page content:', await page.textContent('body'));
        }
      }
      
    } catch (timeoutError) {
      console.log('⏱️ TIMEOUT: No clear success or error within 10 seconds');
      console.log('Current URL:', page.url());
      console.log('Page title:', await page.title());
    }
    
  } catch (error) {
    console.error('🚨 Test Error:', error.message);
  } finally {
    console.log('\n📋 Closing browser...');
    await browser.close();
  }
}

// Run the test
testSurgicalAuthFix().catch(console.error);
