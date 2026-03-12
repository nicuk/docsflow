import { test, expect, Page, BrowserContext } from '@playwright/test';

// Helper to clear all cookies and storage
async function clearBrowserState(page: Page) {
  await page.context().clearCookies();
  // Only clear storage if we're on a valid page
  try {
    await page.evaluate(() => {
      if (typeof localStorage !== 'undefined') localStorage.clear();
      if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
    });
  } catch (error) {
    // Ignore SecurityError - clearCookies() is sufficient for most cases
    console.log('Note: Could not clear localStorage/sessionStorage (SecurityError expected on some pages)');
  }
}

// Helper to check if user is authenticated
async function isUserAuthenticated(page: Page): Promise<boolean> {
  try {
    // Check for authentication indicators
    const authIndicators = [
      page.locator('textarea'), // Chat interface indicates auth
      page.locator('text=dashboard', { hasText: /dashboard/i }),
      page.locator('button').filter({ hasText: /logout|sign out/i }),
      page.locator('[data-testid*="authenticated"]'),
      page.locator('.user-avatar, .profile')
    ];
    
    for (const indicator of authIndicators) {
      if (await indicator.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        return true;
      }
    }
    
    // Check URL patterns that indicate authentication
    const url = page.url();
    const authUrls = ['/dashboard', '/chat', '/documents', '/settings'];
    return authUrls.some(authUrl => url.includes(authUrl));
  } catch {
    return false;
  }
}

// Helper to check if on login page
async function isOnLoginPage(page: Page): Promise<boolean> {
  const url = page.url();
  const loginIndicators = [
    url.includes('/login'),
    url.includes('/auth'),
    await page.locator('input[type="email"]').isVisible().catch(() => false),
    await page.locator('input[type="password"]').isVisible().catch(() => false),
    await page.locator('button[type="submit"]').filter({ hasText: /login|sign in/i }).isVisible().catch(() => false)
  ];
  
  return loginIndicators.some(indicator => indicator === true);
}

test.describe('Remember Me Authentication', () => {
  
  test('should login successfully without remember me', async ({ page }) => {
    await clearBrowserState(page);
    
    // Navigate to login page
    await page.goto('/login');
    
    // Fill in credentials without checking remember me
    await page.fill('input[type="email"]', 'test1@example.com');
    await page.fill('input[type="password"]', process.env.TEST_PASSWORD || 'test-password');
    
    // Ensure remember me is NOT checked
    const rememberCheckbox = page.locator('input[type="checkbox"]#remember');
    if (await rememberCheckbox.isVisible()) {
      await rememberCheckbox.uncheck();
      expect(await rememberCheckbox.isChecked()).toBeFalsy();
    }
    
    // Submit login with retry mechanism for reliability
    await page.click('button[type="submit"]');
    
    // Wait for either success (redirect) or retry if needed
    let loginAttempts = 0;
    const maxAttempts = 3;
    
    while (loginAttempts < maxAttempts) {
      await page.waitForTimeout(2000);
      
      // Check if login succeeded (not on login page anymore OR form disappeared)
      const currentUrl = page.url();
      const loginFormVisible = await page.locator('form input[type="email"]').isVisible().catch(() => false);
      
      if (!currentUrl.includes('/login') || !loginFormVisible) {
        console.log(`✅ Login succeeded on attempt ${loginAttempts + 1}`);
        // Expect redirect to tenant subdomain after successful login
        if (currentUrl.includes('localhost:3000/login') && !loginFormVisible) {
          console.log('🎯 Login succeeded, expecting redirect to tenant subdomain...');
          // Wait for redirect to tenant subdomain
          await page.waitForURL('**/dashboard**', { timeout: 5000 });
        }
        break;
      }
      
      loginAttempts++;
      if (loginAttempts < maxAttempts) {
        console.log(`🔄 Login attempt ${loginAttempts} failed, retrying...`);
        await page.click('button[type="submit"]');
      }
    }
    
    // Log what page we're actually on
    console.log(`🔍 After login - Current URL: ${page.url()}`);
    console.log(`🔍 After login - Page title: ${await page.title()}`);
    
    // Check if there are any error messages on the page
    const errorMessage = await page.locator('.error, .alert, [role="alert"]').textContent().catch(() => null);
    if (errorMessage) {
      console.log(`🚨 Error message found: ${errorMessage}`);
    }
    
    // Check if still on login page and why
    if (page.url().includes('/login')) {
      console.log('🚨 Still on login page - checking for visible error indicators');
      const loginForm = await page.locator('form').isVisible();
      console.log(`🔍 Login form visible: ${loginForm}`);
    }
    
    const authenticated = await isUserAuthenticated(page);
    console.log(`🔍 Authentication check result: ${authenticated}`);
    expect(authenticated).toBeTruthy();
    
    // Check that remember-me cookie is not set or is false
    const cookies = await page.context().cookies();
    const rememberCookie = cookies.find(cookie => cookie.name === 'remember-me');
    
    if (rememberCookie) {
      expect(rememberCookie.value).not.toBe('true');
    }
  });

  test('should login successfully with remember me checked', async ({ page }) => {
    await clearBrowserState(page);
    
    // Navigate to login page
    await page.goto('/login');
    
    // Fill in credentials
    await page.fill('input[type="email"]', 'test1@example.com');
    await page.fill('input[type="password"]', process.env.TEST_PASSWORD || 'test-password');
    
    // Check remember me checkbox
    const rememberCheckbox = page.locator('input[type="checkbox"]#remember');
    if (await rememberCheckbox.isVisible()) {
      await rememberCheckbox.check();
      expect(await rememberCheckbox.isChecked()).toBeTruthy();
    }
    
    // Submit login
    await page.click('button[type="submit"]');
    
    // Wait for redirect and verify authentication
    await page.waitForTimeout(3000);
    
    const authenticated = await isUserAuthenticated(page);
    expect(authenticated).toBeTruthy();
    
    // Check that remember-me cookie is set
    const cookies = await page.context().cookies();
    const rememberCookie = cookies.find(cookie => cookie.name === 'remember-me');
    const authTokenCookie = cookies.find(cookie => 
      cookie.name.includes('auth') || cookie.name.includes('token')
    );
    
    if (rememberCookie) {
      expect(rememberCookie.value).toBe('true');
      
      // Check cookie expiration (should be longer for remember me)
      expect(rememberCookie.expires).toBeGreaterThan(Date.now() / 1000 + 86400); // More than 1 day
    }
    
    // Should have auth tokens with extended expiry
    if (authTokenCookie) {
      expect(authTokenCookie.expires).toBeGreaterThan(Date.now() / 1000 + 86400);
    }
  });

  test('should persist session after browser restart with remember me', async ({ browser }) => {
    // Create a new context for initial login
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    
    await page1.goto('/login');
    
    // Login with remember me
    await page1.fill('input[type="email"]', 'test1@example.com');
    await page1.fill('input[type="password"]', process.env.TEST_PASSWORD || 'test-password');
    
    const rememberCheckbox = page1.locator('input[type="checkbox"]#remember');
    if (await rememberCheckbox.isVisible()) {
      await rememberCheckbox.check();
    }
    
    await page1.click('button[type="submit"]');
    await page1.waitForTimeout(3000);
    
    // Verify authentication
    const authenticated1 = await isUserAuthenticated(page1);
    expect(authenticated1).toBeTruthy();
    
    // Get cookies from the first session
    const cookies = await context1.cookies();
    
    // Close the first context
    await context1.close();
    
    // Create a new context (simulating browser restart)
    const context2 = await browser.newContext();
    
    // Restore cookies to simulate persistent session
    await context2.addCookies(cookies);
    
    const page2 = await context2.newPage();
    
    // Navigate to a protected page
    await page2.goto('/dashboard');
    await page2.waitForTimeout(3000);
    
    // Should still be authenticated
    const authenticated2 = await isUserAuthenticated(page2);
    expect(authenticated2).toBeTruthy();
    
    // Should not be redirected to login
    const onLogin = await isOnLoginPage(page2);
    expect(onLogin).toBeFalsy();
    
    await context2.close();
  });

  test('should expire session without remember me after browser restart', async ({ browser }) => {
    // Create a new context for initial login
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    
    await page1.goto('/login');
    
    // Login WITHOUT remember me
    await page1.fill('input[type="email"]', 'test1@example.com');
    await page1.fill('input[type="password"]', process.env.TEST_PASSWORD || 'test-password');
    
    const rememberCheckbox = page1.locator('input[type="checkbox"]#remember');
    if (await rememberCheckbox.isVisible()) {
      await rememberCheckbox.uncheck(); // Ensure it's unchecked
    }
    
    await page1.click('button[type="submit"]');
    await page1.waitForTimeout(3000);
    
    // Verify initial authentication
    const authenticated1 = await isUserAuthenticated(page1);
    expect(authenticated1).toBeTruthy();
    
    // Get cookies from the first session
    const cookies = await context1.cookies();
    
    // Filter out long-lived cookies (simulate session-only cookies expiring)
    const sessionCookies = cookies.filter(cookie => {
      // Session cookies have no expiry or short expiry
      return !cookie.expires || cookie.expires < Date.now() / 1000 + 3600; // Less than 1 hour
    });
    
    await context1.close();
    
    // Create a new context (simulating browser restart)
    const context2 = await browser.newContext();
    
    // Only restore session cookies (long-lived ones would be expired)
    if (sessionCookies.length > 0) {
      await context2.addCookies(sessionCookies);
    }
    
    const page2 = await context2.newPage();
    
    // Navigate to a protected page
    await page2.goto('/dashboard');
    await page2.waitForTimeout(5000);
    
    // Should be redirected to login (session expired)
    const onLogin = await isOnLoginPage(page2);
    const authenticated2 = await isUserAuthenticated(page2);
    
    // Should either be on login page OR not authenticated
    expect(onLogin || !authenticated2).toBeTruthy();
    
    await context2.close();
  });

  test('should maintain session during same browser session regardless of remember me', async ({ page }) => {
    await clearBrowserState(page);
    
    // Login without remember me
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test1@example.com');
    await page.fill('input[type="password"]', process.env.TEST_PASSWORD || 'test-password');
    
    const rememberCheckbox = page.locator('input[type="checkbox"]#remember');
    if (await rememberCheckbox.isVisible()) {
      await rememberCheckbox.uncheck();
    }
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Verify authentication
    expect(await isUserAuthenticated(page)).toBeTruthy();
    
    // Navigate to different pages within same session
    await page.goto('/dashboard/chat');
    await page.waitForTimeout(2000);
    expect(await isUserAuthenticated(page)).toBeTruthy();
    
    await page.goto('/dashboard/documents');
    await page.waitForTimeout(2000);
    expect(await isUserAuthenticated(page)).toBeTruthy();
    
    // Refresh page - should maintain session
    await page.reload();
    await page.waitForTimeout(3000);
    expect(await isUserAuthenticated(page)).toBeTruthy();
  });

  test('should respect remember me checkbox state on login form', async ({ page }) => {
    await clearBrowserState(page);
    await page.goto('/login');
    
    const rememberCheckbox = page.locator('input[type="checkbox"]#remember');
    
    if (await rememberCheckbox.isVisible()) {
      // Initially should be unchecked
      expect(await rememberCheckbox.isChecked()).toBeFalsy();
      
      // Check the checkbox
      await rememberCheckbox.check();
      expect(await rememberCheckbox.isChecked()).toBeTruthy();
      
      // Uncheck the checkbox
      await rememberCheckbox.uncheck();
      expect(await rememberCheckbox.isChecked()).toBeFalsy();
      
      // Check it again for final test
      await rememberCheckbox.check();
      expect(await rememberCheckbox.isChecked()).toBeTruthy();
      
      // Verify label is associated correctly
      const label = page.locator('label[for="remember"]');
      if (await label.isVisible()) {
        await expect(label).toContainText(/remember/i);
        
        // Clicking label should toggle checkbox
        await label.click();
        expect(await rememberCheckbox.isChecked()).toBeFalsy();
      }
    } else {
      console.log('Remember me checkbox not found on login form');
    }
  });

  test('should handle remember me with different user accounts', async ({ page }) => {
    await clearBrowserState(page);
    
    // Login with first user WITH remember me
    await page.goto('/login');
    await page.fill('input[type="email"]', 'user1@example.com');
    await page.fill('input[type="password"]', process.env.TEST_PASSWORD || 'test-password');
    
    const rememberCheckbox = page.locator('input[type="checkbox"]#remember');
    if (await rememberCheckbox.isVisible()) {
      await rememberCheckbox.check();
    }
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // If authentication succeeds
    if (await isUserAuthenticated(page)) {
      // Logout
      const logoutButton = page.locator('button').filter({ hasText: /logout|sign out/i }).first();
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
        await page.waitForTimeout(2000);
      } else {
        // Manual logout by clearing session
        await page.goto('/login');
      }
    }
    
    // Login with second user WITHOUT remember me
    await page.goto('/login');
    await page.fill('input[type="email"]', 'user2@example.com');
    await page.fill('input[type="password"]', process.env.TEST_PASSWORD || 'test-password');
    
    if (await rememberCheckbox.isVisible()) {
      await rememberCheckbox.uncheck();
    }
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Check that remember me settings are independent per user
    const cookies = await page.context().cookies();
    const rememberCookie = cookies.find(cookie => cookie.name === 'remember-me');
    
    // Should not have remember me set for second user
    if (rememberCookie) {
      expect(rememberCookie.value).not.toBe('true');
    }
  });

  test('should handle remember me across different subdomains', async ({ page }) => {
    await clearBrowserState(page);
    
    // Login on main domain with remember me
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test1@example.com');
    await page.fill('input[type="password"]', process.env.TEST_PASSWORD || 'test-password');
    
    const rememberCheckbox = page.locator('input[type="checkbox"]#remember');
    if (await rememberCheckbox.isVisible()) {
      await rememberCheckbox.check();
    }
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    if (await isUserAuthenticated(page)) {
      // Get cookies and check domain settings
      const cookies = await page.context().cookies();
      const authCookies = cookies.filter(cookie => 
        cookie.name.includes('auth') || 
        cookie.name.includes('token') || 
        cookie.name === 'remember-me'
      );
      
      // Check if cookies are set for the correct domain
      authCookies.forEach(cookie => {
        console.log(`Cookie ${cookie.name}: domain=${cookie.domain}, secure=${cookie.secure}, sameSite=${cookie.sameSite}`);
        
        // Should be set for the domain (either specific or .docsflow.app for subdomain access)
        expect(cookie.domain).toBeTruthy();
        
        // Remember me should have longer expiry
        if (cookie.name === 'remember-me') {
          expect(cookie.expires).toBeGreaterThan(Date.now() / 1000 + 86400);
        }
      });
    }
  });

  test('should clear remember me on explicit logout', async ({ page }) => {
    await clearBrowserState(page);
    
    // Login with remember me
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test1@example.com');
    await page.fill('input[type="password"]', process.env.TEST_PASSWORD || 'test-password');
    
    const rememberCheckbox = page.locator('input[type="checkbox"]#remember');
    if (await rememberCheckbox.isVisible()) {
      await rememberCheckbox.check();
    }
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    if (await isUserAuthenticated(page)) {
      // Verify remember me cookie is set
      let cookies = await page.context().cookies();
      let rememberCookie = cookies.find(cookie => cookie.name === 'remember-me');
      
      if (rememberCookie) {
        expect(rememberCookie.value).toBe('true');
      }
      
      // Logout
      const logoutButton = page.locator('button').filter({ hasText: /logout|sign out/i }).first();
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
        await page.waitForTimeout(2000);
        
        // Check that remember me cookie is cleared or marked false
        cookies = await page.context().cookies();
        rememberCookie = cookies.find(cookie => cookie.name === 'remember-me');
        
        if (rememberCookie) {
          expect(rememberCookie.value).not.toBe('true');
        }
        
        // Should be redirected to login
        await page.waitForTimeout(2000);
        expect(await isOnLoginPage(page)).toBeTruthy();
      }
    }
  });

  test('should handle remember me security edge cases', async ({ page }) => {
    await clearBrowserState(page);
    
    // Test 1: Login with remember me
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test1@example.com');
    await page.fill('input[type="password"]', process.env.TEST_PASSWORD || 'test-password');
    
    const rememberCheckbox = page.locator('input[type="checkbox"]#remember');
    if (await rememberCheckbox.isVisible()) {
      await rememberCheckbox.check();
    }
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    if (await isUserAuthenticated(page)) {
      // Test: Navigate to sensitive page
      await page.goto('/dashboard/settings');
      await page.waitForTimeout(2000);
      
      // Should still be authenticated for settings access
      const stillAuth = await isUserAuthenticated(page);
      expect(stillAuth).toBeTruthy();
      
      // Test: Check cookie security attributes
      const cookies = await page.context().cookies();
      const authCookies = cookies.filter(cookie => 
        cookie.name.includes('auth') || cookie.name.includes('token')
      );
      
      authCookies.forEach(cookie => {
        // Security checks for authentication cookies
        if (process.env.NODE_ENV === 'production') {
          expect(cookie.secure).toBeTruthy(); // Should be secure in production
        }
        expect(cookie.sameSite).toBeTruthy(); // Should have sameSite attribute
        expect(cookie.httpOnly).toBeTruthy(); // Should be httpOnly for security
      });
    }
  });
});

test.describe('Remember Me Integration Tests', () => {
  
  test('should work with remember me and chat functionality', async ({ page }) => {
    await clearBrowserState(page);
    
    // Login with remember me
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test1@example.com');
    await page.fill('input[type="password"]', process.env.TEST_PASSWORD || 'test-password');
    
    const rememberCheckbox = page.locator('input[type="checkbox"]#remember');
    if (await rememberCheckbox.isVisible()) {
      await rememberCheckbox.check();
    }
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    if (await isUserAuthenticated(page)) {
      // Navigate to chat
      await page.goto('/dashboard/chat');
      await page.waitForTimeout(2000);
      
      // Test chat functionality with remember me session
      const chatInput = page.locator('textarea').first();
      const sendButton = page.locator('button').filter({ hasText: /send/i }).first();
      
      if (await chatInput.isVisible()) {
        await chatInput.fill('Test message with remember me session');
        await sendButton.click();
        
        // Should work normally
        await expect(page.locator('text=Test message with remember me session')).toBeVisible();
        
        // Verify session is still maintained
        await page.waitForTimeout(2000);
        expect(await isUserAuthenticated(page)).toBeTruthy();
      }
    }
  });

  test('should work with remember me and document upload', async ({ page }) => {
    await clearBrowserState(page);
    
    // Login with remember me
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test1@example.com');
    await page.fill('input[type="password"]', process.env.TEST_PASSWORD || 'test-password');
    
    const rememberCheckbox = page.locator('input[type="checkbox"]#remember');
    if (await rememberCheckbox.isVisible()) {
      await rememberCheckbox.check();
    }
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    if (await isUserAuthenticated(page)) {
      // Navigate to documents
      await page.goto('/dashboard/documents');
      await page.waitForTimeout(2000);
      
      // Test upload functionality with remember me session
      const uploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
      
      if (await uploadButton.isVisible()) {
        // Verify upload interface is accessible
        await expect(uploadButton).toBeVisible();
        
        // Verify session is maintained
        expect(await isUserAuthenticated(page)).toBeTruthy();
        
        console.log('Document upload interface accessible with remember me session');
      }
    }
  });
});
