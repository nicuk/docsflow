import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * Production Authentication & Session Timing Tests
 * 
 * Tests the specific issues mentioned:
 * - User login period restrictions
 * - Auth cooldown periods
 * - Session timeouts and forced re-login
 * - Remember me functionality persistence
 * 
 * Runs against live Vercel deployment where auth actually works
 */

// Production test credentials
const PROD_TEST_EMAIL = 'test1@example.com';
const PROD_TEST_PASSWORD = 'Testing123?';

// Helper to safely attempt login
async function attemptLogin(page: Page, email: string, password: string, rememberMe = false) {
  const startTime = Date.now();
  
  try {
    console.log(`🔐 Attempting login: ${email} (remember: ${rememberMe})`);
    
    // Navigate to login
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Fill credentials
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    
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
    
    // Wait for navigation or error
    await Promise.race([
      page.waitForURL('**/dashboard**', { timeout: 15000 }),
      page.waitForURL('**/onboarding**', { timeout: 15000 }),
      page.waitForSelector('text=error, text=failed, text=invalid, text=too many', { timeout: 10000 })
    ]).catch(() => {});
    
    const endTime = Date.now();
    const loginTime = endTime - startTime;
    
    // Analyze result
    const currentUrl = page.url();
    const isSuccess = currentUrl.includes('/dashboard') || currentUrl.includes('/onboarding');
    
    // Check for errors
    const errorElement = page.locator('text=error, text=failed, text=invalid, text=too many').first();
    const hasError = await errorElement.isVisible().catch(() => false);
    const errorText = hasError ? await errorElement.textContent() : null;
    
    return {
      success: isSuccess,
      hasError,
      errorText,
      loginTime,
      finalUrl: currentUrl
    };
    
  } catch (error) {
    const endTime = Date.now();
    return {
      success: false,
      hasError: true,
      errorText: error.message,
      loginTime: endTime - startTime,
      finalUrl: page.url()
    };
  }
}

// Helper to check authentication status
async function checkAuthStatus(page: Page) {
  try {
    // Try to access a protected page
    await page.goto('/dashboard', { waitUntil: 'networkidle', timeout: 15000 });
    
    const currentUrl = page.url();
    const isAuthenticated = !currentUrl.includes('/login');
    
    // Check for UI indicators
    const authIndicators = [
      page.locator('textarea'), // Chat interface
      page.locator('button').filter({ hasText: /logout|sign out/i }),
      page.locator('[data-testid*="authenticated"]')
    ];
    
    let hasAuthUI = false;
    for (const indicator of authIndicators) {
      if (await indicator.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        hasAuthUI = true;
        break;
      }
    }
    
    return {
      isAuthenticated,
      hasAuthUI,
      currentUrl
    };
    
  } catch (error) {
    return {
      isAuthenticated: false,
      hasAuthUI: false,
      currentUrl: page.url(),
      error: error.message
    };
  }
}

test.describe('Production Authentication Timing Tests', () => {
  
  test('test basic login timing on production', async ({ page }) => {
    console.log('🔍 Testing basic login timing on Vercel production...');
    
    const result = await attemptLogin(page, PROD_TEST_EMAIL, PROD_TEST_PASSWORD, false);
    
    console.log('Production login result:', {
      success: result.success,
      hasError: result.hasError,
      errorText: result.errorText,
      loginTime: `${result.loginTime}ms`,
      finalUrl: result.finalUrl
    });
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/production-login-result.png', 
      fullPage: true 
    });
    
    if (result.success) {
      console.log('✅ Production login successful');
      
      // Check session cookies
      const cookies = await page.context().cookies();
      const authCookies = cookies.filter(cookie => 
        cookie.name.includes('auth') || 
        cookie.name.includes('token') || 
        cookie.name.includes('session') ||
        cookie.name === 'remember-me'
      );
      
      console.log('Auth cookies found:', authCookies.length);
      authCookies.forEach(cookie => {
        const expiryTime = cookie.expires ? new Date(cookie.expires * 1000) : null;
        const timeUntilExpiry = expiryTime ? Math.round((expiryTime.getTime() - Date.now()) / 1000) : 'session';
        
        console.log(`- ${cookie.name}: expires in ${timeUntilExpiry}s`);
      });
      
      expect(result.success).toBeTruthy();
    } else {
      console.log('❌ Production login failed:', result.errorText);
    }
  });

  test('test session timeout behavior', async ({ page }) => {
    console.log('🔍 Testing session timeout behavior...');
    
    // Login first
    const loginResult = await attemptLogin(page, PROD_TEST_EMAIL, PROD_TEST_PASSWORD, false);
    
    if (!loginResult.success) {
      console.log('❌ Initial login failed, cannot test session timeout');
      return;
    }
    
    console.log('✅ Initial login successful, testing session persistence...');
    
    // Record initial session state
    const initialCookies = await page.context().cookies();
    const initialAuthCookies = initialCookies.filter(cookie => 
      cookie.name.includes('auth') || cookie.name.includes('token')
    );
    
    console.log('Initial auth cookies:', initialAuthCookies.length);
    
    // Test session at different intervals
    const testIntervals = [30, 60, 120, 300]; // 30s, 1m, 2m, 5m
    
    for (const interval of testIntervals) {
      console.log(`\n⏱️ Testing session after ${interval} seconds...`);
      
      // Wait for the interval
      await page.waitForTimeout(interval * 1000);
      
      // Check if still authenticated
      const authStatus = await checkAuthStatus(page);
      
      console.log(`After ${interval}s:`, {
        isAuthenticated: authStatus.isAuthenticated,
        hasAuthUI: authStatus.hasAuthUI,
        currentUrl: authStatus.currentUrl
      });
      
      if (!authStatus.isAuthenticated) {
        console.log(`🚨 SESSION EXPIRED after ${interval} seconds!`);
        
        // Take screenshot of session expiry
        await page.screenshot({ 
          path: `test-results/session-expired-${interval}s.png`, 
          fullPage: true 
        });
        
        break;
      } else {
        console.log(`✅ Session maintained after ${interval} seconds`);
      }
    }
  });

  test('test remember me session persistence', async ({ page }) => {
    console.log('🔍 Testing remember me session persistence...');
    
    // Login with remember me
    const loginResult = await attemptLogin(page, PROD_TEST_EMAIL, PROD_TEST_PASSWORD, true);
    
    if (!loginResult.success) {
      console.log('❌ Remember me login failed');
      return;
    }
    
    console.log('✅ Remember me login successful');
    
    // Check remember me cookie
    const cookies = await page.context().cookies();
    const rememberCookie = cookies.find(cookie => cookie.name === 'remember-me');
    
    if (rememberCookie) {
      console.log('✅ Remember me cookie found:', {
        value: rememberCookie.value,
        expires: rememberCookie.expires ? new Date(rememberCookie.expires * 1000).toISOString() : 'session',
        maxAge: rememberCookie.expires ? Math.round((rememberCookie.expires * 1000 - Date.now()) / 1000) : 'N/A'
      });
      
      expect(rememberCookie.value).toBe('true');
      
      if (rememberCookie.expires) {
        const timeUntilExpiry = (rememberCookie.expires * 1000 - Date.now()) / 1000;
        expect(timeUntilExpiry).toBeGreaterThan(86400); // Should be > 1 day
      }
    } else {
      console.log('⚠️ Remember me cookie not found');
    }
    
    // Test extended session
    console.log('⏱️ Testing extended session with remember me...');
    await page.waitForTimeout(60000); // Wait 1 minute
    
    const authStatus = await checkAuthStatus(page);
    console.log('After 1 minute with remember me:', authStatus);
    
    expect(authStatus.isAuthenticated).toBeTruthy();
  });

  test('test rapid login attempts for cooldown detection', async ({ page }) => {
    console.log('🔍 Testing rapid login attempts for rate limiting...');
    
    const attempts = [];
    const maxAttempts = 5;
    
    for (let i = 1; i <= maxAttempts; i++) {
      console.log(`\nAttempt ${i}/${maxAttempts}:`);
      
      // Clear any existing session
      await page.context().clearCookies();
      
      const result = await attemptLogin(page, PROD_TEST_EMAIL, PROD_TEST_PASSWORD, false);
      attempts.push(result);
      
      console.log(`Attempt ${i} result:`, {
        success: result.success,
        hasError: result.hasError,
        errorText: result.errorText,
        loginTime: `${result.loginTime}ms`
      });
      
      // Check for rate limiting
      if (result.errorText && result.errorText.toLowerCase().includes('too many')) {
        console.log(`🚨 Rate limiting detected on attempt ${i}:`, result.errorText);
        break;
      }
      
      // Short delay between attempts
      await page.waitForTimeout(2000);
    }
    
    // Analyze results
    const avgTime = attempts.reduce((sum, attempt) => sum + attempt.loginTime, 0) / attempts.length;
    console.log('Average login time:', Math.round(avgTime), 'ms');
    
    const hasRateLimit = attempts.some(attempt => 
      attempt.errorText && attempt.errorText.toLowerCase().includes('too many')
    );
    
    if (hasRateLimit) {
      console.log('✅ Rate limiting is active');
    } else {
      console.log('⚠️ No rate limiting detected in rapid attempts');
      
      // Check if login times increased (soft rate limiting)
      const firstTime = attempts[0].loginTime;
      const lastTime = attempts[attempts.length - 1].loginTime;
      
      if (lastTime > firstTime * 2) {
        console.log('🔍 Possible soft rate limiting detected (increased response times)');
      }
    }
  });

  test('test session behavior across browser tabs', async ({ context }) => {
    console.log('🔍 Testing session behavior across multiple tabs...');
    
    // Create first tab and login
    const page1 = await context.newPage();
    const loginResult = await attemptLogin(page1, PROD_TEST_EMAIL, PROD_TEST_PASSWORD, true);
    
    if (!loginResult.success) {
      console.log('❌ Initial login failed');
      return;
    }
    
    console.log('✅ Login successful in tab 1');
    
    // Create second tab
    const page2 = await context.newPage();
    
    // Check if session is shared
    const authStatus = await checkAuthStatus(page2);
    console.log('Tab 2 auth status:', authStatus);
    
    if (authStatus.isAuthenticated) {
      console.log('✅ Session shared across tabs');
    } else {
      console.log('❌ Session not shared across tabs');
    }
    
    // Test logout in one tab affects other
    if (authStatus.isAuthenticated) {
      console.log('🔍 Testing logout behavior across tabs...');
      
      // Find and click logout in tab 1
      const logoutButton = page1.locator('button').filter({ hasText: /logout|sign out/i }).first();
      
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
        await page1.waitForTimeout(2000);
        
        // Check if tab 2 is also logged out
        const tab2AuthAfterLogout = await checkAuthStatus(page2);
        console.log('Tab 2 auth status after tab 1 logout:', tab2AuthAfterLogout);
        
        if (!tab2AuthAfterLogout.isAuthenticated) {
          console.log('✅ Logout propagated across tabs');
        } else {
          console.log('⚠️ Logout did not propagate to other tabs');
        }
      }
    }
    
    await page1.close();
    await page2.close();
  });

  test('test authentication with subdomain access', async ({ page }) => {
    console.log('🔍 Testing subdomain-based authentication...');
    
    // Login on main domain
    const loginResult = await attemptLogin(page, PROD_TEST_EMAIL, PROD_TEST_PASSWORD, true);
    
    if (!loginResult.success) {
      console.log('❌ Main domain login failed');
      return;
    }
    
    console.log('✅ Main domain login successful');
    
    // Try accessing tenant subdomain
    try {
      await page.goto('https://test-company.docsflow.app/dashboard', { 
        waitUntil: 'networkidle', 
        timeout: 30000 
      });
      
      const subdomainUrl = page.url();
      const isAccessible = !subdomainUrl.includes('/login');
      
      console.log('Subdomain access result:', {
        url: subdomainUrl,
        accessible: isAccessible
      });
      
      if (isAccessible) {
        console.log('✅ Subdomain access successful with main domain session');
      } else {
        console.log('❌ Subdomain access failed - requires separate login');
      }
      
    } catch (error) {
      console.log('❌ Subdomain access error:', error.message);
    }
  });
});

test.describe('Production Performance Tests', () => {
  
  test('measure production login performance', async ({ page }) => {
    console.log('🔍 Measuring production login performance...');
    
    const performanceResults = [];
    const testRuns = 3;
    
    for (let i = 1; i <= testRuns; i++) {
      console.log(`\nPerformance test run ${i}/${testRuns}:`);
      
      // Clear state
      await page.context().clearCookies();
      
      const startTime = Date.now();
      const result = await attemptLogin(page, PROD_TEST_EMAIL, PROD_TEST_PASSWORD, false);
      const totalTime = Date.now() - startTime;
      
      performanceResults.push({
        run: i,
        success: result.success,
        loginTime: result.loginTime,
        totalTime: totalTime
      });
      
      console.log(`Run ${i}:`, {
        success: result.success,
        loginTime: `${result.loginTime}ms`,
        totalTime: `${totalTime}ms`
      });
      
      // Wait between runs
      await page.waitForTimeout(3000);
    }
    
    // Calculate averages
    const successfulRuns = performanceResults.filter(r => r.success);
    if (successfulRuns.length > 0) {
      const avgLoginTime = successfulRuns.reduce((sum, r) => sum + r.loginTime, 0) / successfulRuns.length;
      const avgTotalTime = successfulRuns.reduce((sum, r) => sum + r.totalTime, 0) / successfulRuns.length;
      
      console.log('\n📊 Performance Summary:');
      console.log(`- Successful runs: ${successfulRuns.length}/${testRuns}`);
      console.log(`- Average login time: ${Math.round(avgLoginTime)}ms`);
      console.log(`- Average total time: ${Math.round(avgTotalTime)}ms`);
      
      // Performance expectations for production
      expect(avgLoginTime).toBeLessThan(10000); // Login should complete within 10s
      expect(avgTotalTime).toBeLessThan(15000);  // Total flow should complete within 15s
    }
  });
});
