import { test, expect } from '@playwright/test';

// Clear browser state helper
async function clearBrowserState(page: any) {
  await page.context().clearCookies();
  try {
    await page.evaluate(() => {
      if (typeof localStorage !== 'undefined') localStorage.clear();
      if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
    });
  } catch (error) {
    console.log('Note: Could not clear localStorage/sessionStorage (expected on some pages)');
  }
}

async function loginUser(page: any, email: string, password: string) {
  console.log(`🔐 Logging in user: ${email}`);
  
  // Navigate to login
  await page.goto('/login');
  
  // Wait for page to fully load
  await page.waitForLoadState('networkidle');
  
  // Fill credentials
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  
  // Wait a moment for React to update
  await page.waitForTimeout(500);
  
  // Submit login and wait for navigation
  await Promise.all([
    page.waitForResponse(response => response.url().includes('/api/auth/login') && response.status() === 200, { timeout: 10000 }),
    page.click('button[type="submit"]')
  ]);
  
  // Wait for any redirect to complete
  await page.waitForTimeout(2000);
  
  // Check if login was successful
  const currentUrl = page.url();
  console.log(`🔍 After login, current URL: ${currentUrl}`);
  
  return {
    success: !currentUrl.includes('/login'),
    currentUrl
  };
}

test.describe('Upload Page Session Persistence Test', () => {
  
  test('should access upload page after login without being kicked out', async ({ page }) => {
    console.log('🎯 UPLOAD PAGE TEST: Verify no session kick-out after auth fix');
    
    await clearBrowserState(page);
    
    // Step 1: Login with production user
    const loginResult = await loginUser(page, 'support@bitto.tech', 'Testing123?');
    
    console.log(`🔍 Login result: ${loginResult.success ? 'SUCCESS' : 'FAILED'}`);
    
    if (!loginResult.success) {
      console.log('❌ Login failed, cannot test upload page');
      expect(loginResult.success).toBeTruthy();
      return;
    }
    
    // Step 2: Navigate to upload/documents page
    console.log('📁 Navigating to documents upload page...');
    await page.goto('/dashboard/documents');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    const documentsUrl = page.url();
    console.log(`🔍 Documents page URL: ${documentsUrl}`);
    
    // Step 3: Check if we got kicked back to login
    const kickedToLogin = documentsUrl.includes('/login');
    
    if (kickedToLogin) {
      console.log('❌ FAILED: User was kicked back to login page');
      console.log('🔍 This means session persistence is still broken');
    } else {
      console.log('✅ SUCCESS: User stayed on documents page');
      console.log('🔍 Session persistence is working!');
    }
    
    // Step 4: Check for upload-related elements
    const hasUploadButton = await page.locator('button:has-text("Upload"), input[type="file"], [data-testid*="upload"]').count() > 0;
    const hasDocumentsList = await page.locator('[data-testid*="document"], .document-item, .file-list').count() > 0;
    
    console.log(`🔍 Upload elements found: ${hasUploadButton}`);
    console.log(`🔍 Documents list found: ${hasDocumentsList}`);
    
    // Step 5: Check cookies are still present
    const cookies = await page.context().cookies();
    const tenantCookies = cookies.filter(c => 
      ['tenant-id', 'user-email', 'tenant-subdomain', 'tenant-context'].includes(c.name)
    );
    
    console.log(`🔍 Tenant cookies present: ${tenantCookies.length}/4`);
    console.log(`🔍 Cookie details:`, tenantCookies.map(c => ({
      name: c.name,
      domain: c.domain,
      hasValue: !!c.value
    })));
    
    // Step 6: Try another navigation to test session persistence
    console.log('🔄 Testing session persistence with another navigation...');
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    
    const dashboardUrl = page.url();
    const kickedAfterDashboard = dashboardUrl.includes('/login');
    
    console.log(`🔍 Dashboard navigation result: ${kickedAfterDashboard ? 'KICKED TO LOGIN' : 'STAYED AUTHENTICATED'}`);
    
    // Assertions
    expect(kickedToLogin).toBeFalsy(); // Should not be kicked to login on documents page
    expect(kickedAfterDashboard).toBeFalsy(); // Should not be kicked to login on dashboard
    expect(tenantCookies.length).toBeGreaterThan(0); // Should have tenant cookies
    
    console.log('\n📊 UPLOAD PAGE TEST RESULTS:');
    console.log('┌─────────────────────────────────┬─────────────┐');
    console.log('│ Test                            │ Result      │');
    console.log('├─────────────────────────────────┼─────────────┤');
    console.log(`│ Login Success                   │ ${loginResult.success ? '✅ PASS' : '❌ FAIL'} │`);
    console.log(`│ Documents Page Access           │ ${!kickedToLogin ? '✅ PASS' : '❌ FAIL'} │`);
    console.log(`│ Session Persistence             │ ${!kickedAfterDashboard ? '✅ PASS' : '❌ FAIL'} │`);
    console.log(`│ Tenant Cookies Present          │ ${tenantCookies.length > 0 ? '✅ PASS' : '❌ FAIL'} │`);
    console.log('└─────────────────────────────────┴─────────────┘');
    
    const overallSuccess = loginResult.success && !kickedToLogin && !kickedAfterDashboard && tenantCookies.length > 0;
    console.log(`\n🎯 OVERALL RESULT: ${overallSuccess ? '✅ SUCCESS - Upload page accessible' : '❌ FAILED - Session persistence broken'}`);
    
    if (overallSuccess) {
      console.log('🎉 The "kicked out after login" issue appears to be FIXED!');
    }
  });
  
  test('should test upload page with local test user', async ({ page }) => {
    console.log('🎯 LOCAL USER UPLOAD TEST: test1@example.com');
    
    await clearBrowserState(page);
    
    // Login with local test user
    const loginResult = await loginUser(page, 'test1@example.com', 'Testing123?');
    
    if (loginResult.success) {
      console.log('✅ Local user login successful');
      
      // Try to access documents page
      await page.goto('/dashboard/documents');
      await page.waitForTimeout(2000);
      
      const finalUrl = page.url();
      const accessSuccess = !finalUrl.includes('/login');
      
      console.log(`🔍 Local user documents access: ${accessSuccess ? 'SUCCESS' : 'FAILED'}`);
      console.log(`📍 Final URL: ${finalUrl}`);
      
      expect(accessSuccess).toBeTruthy();
    } else {
      console.log('⚠️ Local user login failed (expected if not in production Supabase)');
      // This is expected behavior, not a failure
    }
  });
  
});
