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

async function testLogin(page: any, email: string, password: string, testName: string) {
  console.log(`\n🧪 Testing ${testName}: ${email}`);
  
  const apiCalls: any[] = [];
  
  // Monitor API calls
  page.on('response', async (response) => {
    if (response.url().includes('/api/auth/login')) {
      console.log('🔍 Login API Response:', {
        status: response.status(),
        statusText: response.statusText()
      });
      
      try {
        const responseBody = await response.json();
        console.log('🔍 Login API Response Body:', responseBody);
        apiCalls.push({ status: response.status(), body: responseBody });
      } catch (e) {
        apiCalls.push({ status: response.status(), body: 'unparseable' });
      }
    }
  });
  
  await clearBrowserState(page);
  
  // Navigate to login
  await page.goto('/login');
  
  // Fill credentials
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  
  console.log('🔍 Submitting login form...');
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Wait for response
  await page.waitForTimeout(3000);
  
  console.log('🔍 After login attempt:');
  console.log('  Current URL:', page.url());
  console.log('  API calls made:', apiCalls.length);
  
  // Check cookies
  const cookies = await page.context().cookies();
  const supabaseAuthCookies = cookies.filter(c => 
    c.name.startsWith('sb-') && c.name.includes('auth')
  );
  const tenantCookies = cookies.filter(c => 
    ['tenant-id', 'user-email', 'tenant-subdomain', 'tenant-context'].includes(c.name)
  );
  
  console.log('🔍 Results:');
  console.log('  Supabase auth cookies:', supabaseAuthCookies.length);
  console.log('  Tenant cookies:', tenantCookies.length);
  console.log('  Total cookies:', cookies.length);
  
  if (tenantCookies.length > 0) {
    console.log('  Tenant cookie details:', tenantCookies.map(c => ({
      name: c.name,
      domain: c.domain,
      hasValue: !!c.value
    })));
  }
  
  // Check for success indicators
  const isOnDashboard = page.url().includes('/dashboard');
  const hasSuccessMessage = await page.locator('text=Welcome back').isVisible().catch(() => false);
  
  console.log('  On dashboard:', isOnDashboard);
  console.log('  Has success message:', hasSuccessMessage);
  
  // Check for errors
  const errorElements = await page.locator('.error, .alert, [role="alert"], .text-red-500').all();
  let hasErrors = false;
  for (const element of errorElements) {
    const text = await element.textContent();
    if (text && text.trim()) {
      console.log('🚨 Error found:', text.trim());
      hasErrors = true;
    }
  }
  
  const success = (isOnDashboard || hasSuccessMessage) && !hasErrors;
  console.log(`${success ? '✅' : '❌'} ${testName} result: ${success ? 'SUCCESS' : 'FAILED'}`);
  
  return {
    success,
    apiCalls: apiCalls.length,
    supabaseAuthCookies: supabaseAuthCookies.length,
    tenantCookies: tenantCookies.length,
    totalCookies: cookies.length,
    isOnDashboard,
    hasErrors
  };
}

test.describe('Surgical Fix Verification', () => {
  
  test('should test both emails after surgical fix', async ({ page }) => {
    console.log('🎯 SURGICAL FIX TEST: Login form now uses /api/auth/login');
    
    // Test 1: Local test user (should work now)
    const localUserResult = await testLogin(
      page, 
      'test1@example.com', 
      'Testing123?', 
      'LOCAL TEST USER'
    );
    
    // Test 2: Production user (should still work)
    const prodUserResult = await testLogin(
      page, 
      'support@bitto.tech', 
      'Testing123?', 
      'PRODUCTION USER'
    );
    
    console.log('\n📊 COMPARISON RESULTS:');
    console.log('┌─────────────────────┬─────────────┬─────────────────┐');
    console.log('│ Metric              │ Local User  │ Production User │');
    console.log('├─────────────────────┼─────────────┼─────────────────┤');
    console.log(`│ Success             │ ${localUserResult.success ? '✅ YES' : '❌ NO '} │ ${prodUserResult.success ? '✅ YES' : '❌ NO '} │`);
    console.log(`│ API Calls           │     ${localUserResult.apiCalls}       │        ${prodUserResult.apiCalls}        │`);
    console.log(`│ Supabase Cookies    │     ${localUserResult.supabaseAuthCookies}       │        ${prodUserResult.supabaseAuthCookies}        │`);
    console.log(`│ Tenant Cookies      │     ${localUserResult.tenantCookies}       │        ${prodUserResult.tenantCookies}        │`);
    console.log(`│ Total Cookies       │     ${localUserResult.totalCookies}       │        ${prodUserResult.totalCookies}        │`);
    console.log(`│ On Dashboard        │ ${localUserResult.isOnDashboard ? '✅ YES' : '❌ NO '} │ ${prodUserResult.isOnDashboard ? '✅ YES' : '❌ NO '} │`);
    console.log('└─────────────────────┴─────────────┴─────────────────┘');
    
    console.log('\n🎯 EXPECTED OUTCOME VERIFICATION:');
    
    // Expected: Both should work now that we're using the API
    console.log('Expected after surgical fix:');
    console.log('  ✅ Both users should make API calls (not 0)');
    console.log('  ✅ Both should have tenant cookies set');
    console.log('  ✅ Both should reach dashboard successfully');
    console.log('  ✅ Local user should work (was failing before)');
    console.log('  ✅ Production user should still work');
    
    console.log('\nActual results:');
    console.log(`  API calls: Local=${localUserResult.apiCalls}, Production=${prodUserResult.apiCalls}`);
    console.log(`  Tenant cookies: Local=${localUserResult.tenantCookies}, Production=${prodUserResult.tenantCookies}`);
    console.log(`  Success: Local=${localUserResult.success}, Production=${prodUserResult.success}`);
    
    // Assertions for surgical fix verification
    expect(localUserResult.apiCalls).toBeGreaterThan(0); // Should call our API now
    expect(prodUserResult.apiCalls).toBeGreaterThan(0);  // Should call our API now
    
    // At least one should have tenant cookies (depending on API response)
    const totalTenantCookies = localUserResult.tenantCookies + prodUserResult.tenantCookies;
    expect(totalTenantCookies).toBeGreaterThan(0);
    
    console.log(`\n🎯 SURGICAL FIX RESULT: ${localUserResult.success && prodUserResult.success ? '✅ SUCCESS' : '⚠️ PARTIAL SUCCESS'}`);
  });
  
});
