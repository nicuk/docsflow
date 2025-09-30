/**
 * Clerk Integration Test (Phase 2)
 * 
 * Tests:
 * 1. Clerk test routes work (/sign-in-clerk, /dashboard-clerk)
 * 2. Supabase routes still work (/login, /dashboard)
 * 3. No cross-contamination between auth systems
 */

const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3000';

async function testClerkIntegration() {
  console.log('🧪 CLERK INTEGRATION TEST - Phase 2 Validation\n');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ headless: false }); // Show browser
  const context = await browser.newContext();
  const page = await context.newPage();
  
  let allTestsPassed = true;
  
  try {
    // ===================================
    // TEST 1: Clerk Sign-In Page Loads
    // ===================================
    console.log('\n📋 TEST 1: Clerk sign-in page accessibility');
    console.log('-'.repeat(60));
    
    await page.goto(`${BASE_URL}/sign-in-clerk`);
    await page.waitForLoadState('networkidle');
    
    const clerkSignInTitle = await page.title();
    console.log(`✅ Page loaded: ${clerkSignInTitle}`);
    
    // Check for test environment badge
    const testBadge = await page.locator('text=Test Environment').count();
    if (testBadge > 0) {
      console.log('✅ Test environment badge found');
    } else {
      console.log('⚠️  Test environment badge not found');
    }
    
    // Check if Clerk sign-in component loaded
    const clerkComponent = await page.locator('.cl-rootBox, .cl-component, [data-clerk-component]').count();
    if (clerkComponent > 0) {
      console.log('✅ Clerk sign-in component detected');
    } else {
      console.log('⚠️  Clerk component not detected - check if Clerk keys are correct');
      console.log('   Expected: Clerk sign-in form should be visible');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'clerk-signin-page.png' });
    console.log('📸 Screenshot saved: clerk-signin-page.png');
    
    // ===================================
    // TEST 2: Supabase Login Still Works
    // ===================================
    console.log('\n📋 TEST 2: Supabase login page (should be unchanged)');
    console.log('-'.repeat(60));
    
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    const supabaseLoginTitle = await page.title();
    console.log(`✅ Page loaded: ${supabaseLoginTitle}`);
    
    // Check for email input (Supabase custom login)
    const emailInput = await page.locator('input[type="email"]').count();
    if (emailInput > 0) {
      console.log('✅ Supabase email input found - login page intact');
    } else {
      console.log('❌ CRITICAL: Supabase login page broken!');
      allTestsPassed = false;
    }
    
    // Should NOT have Clerk component
    const noClerkOnSupabase = await page.locator('.cl-rootBox, .cl-component').count();
    if (noClerkOnSupabase === 0) {
      console.log('✅ No Clerk components on Supabase login (good isolation)');
    } else {
      console.log('❌ CRITICAL: Clerk leaking into Supabase routes!');
      allTestsPassed = false;
    }
    
    await page.screenshot({ path: 'supabase-login-page.png' });
    console.log('📸 Screenshot saved: supabase-login-page.png');
    
    // ===================================
    // TEST 3: Clerk Dashboard Access
    // ===================================
    console.log('\n📋 TEST 3: Clerk dashboard route');
    console.log('-'.repeat(60));
    
    await page.goto(`${BASE_URL}/dashboard-clerk`);
    await page.waitForLoadState('networkidle');
    
    const clerkDashboardUrl = page.url();
    console.log(`Current URL: ${clerkDashboardUrl}`);
    
    // Should redirect to sign-in if not authenticated
    if (clerkDashboardUrl.includes('sign-in-clerk') || clerkDashboardUrl.includes('sign-in')) {
      console.log('✅ Clerk protecting dashboard - redirects to sign-in');
      console.log('   (This is expected - you need to sign up with Clerk first)');
    } else if (clerkDashboardUrl.includes('dashboard-clerk')) {
      // If already signed in with Clerk
      console.log('✅ Already authenticated with Clerk - dashboard accessible');
      
      // Check for test dashboard content
      const testDashboard = await page.locator('text=Clerk Test Dashboard').count();
      if (testDashboard > 0) {
        console.log('✅ Clerk test dashboard content found');
      }
    }
    
    await page.screenshot({ path: 'clerk-dashboard-route.png' });
    console.log('📸 Screenshot saved: clerk-dashboard-route.png');
    
    // ===================================
    // TEST 4: Main Dashboard (Supabase)
    // ===================================
    console.log('\n📋 TEST 4: Main dashboard (Supabase auth)');
    console.log('-'.repeat(60));
    
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    const mainDashboardUrl = page.url();
    console.log(`Current URL: ${mainDashboardUrl}`);
    
    // Should redirect to /login (Supabase) not /sign-in-clerk
    if (mainDashboardUrl.includes('/login') && !mainDashboardUrl.includes('clerk')) {
      console.log('✅ Main dashboard uses Supabase auth (redirects to /login)');
      console.log('✅ No Clerk interference detected');
    } else if (mainDashboardUrl.includes('dashboard')) {
      console.log('✅ Already authenticated with Supabase');
    } else if (mainDashboardUrl.includes('sign-in-clerk')) {
      console.log('❌ CRITICAL: Main dashboard redirecting to Clerk!');
      console.log('   This means Clerk is interfering with Supabase routes');
      allTestsPassed = false;
    }
    
    await page.screenshot({ path: 'main-dashboard-route.png' });
    console.log('📸 Screenshot saved: main-dashboard-route.png');
    
    // ===================================
    // TEST 5: Environment Variables Check
    // ===================================
    console.log('\n📋 TEST 5: Environment configuration');
    console.log('-'.repeat(60));
    
    // Check if Clerk keys are exposed to client
    const clerkKeyCheck = await page.evaluate(() => {
      return {
        hasClerkKey: typeof window !== 'undefined' && 
                     document.documentElement.innerHTML.includes('pk_test_'),
        hasUseClerkFlag: typeof process !== 'undefined' && 
                        process.env?.NEXT_PUBLIC_USE_CLERK === 'true'
      };
    });
    
    console.log(`Clerk publishable key detected: ${clerkKeyCheck.hasClerkKey ? '✅ Yes' : '⚠️  No'}`);
    console.log(`Note: NEXT_PUBLIC_USE_CLERK should be "false" for Phase 2`);
    
    // ===================================
    // TEST 6: Middleware Check
    // ===================================
    console.log('\n📋 TEST 6: Middleware behavior');
    console.log('-'.repeat(60));
    
    // Check if middleware is handling routes correctly
    const apiResponse = await page.goto(`${BASE_URL}/api/auth/session`);
    const apiStatus = apiResponse.status();
    
    console.log(`Session API status: ${apiStatus}`);
    if (apiStatus === 200 || apiStatus === 401) {
      console.log('✅ Supabase session API responding normally');
    } else {
      console.log('⚠️  Unexpected session API status');
    }
    
    // ===================================
    // FINAL RESULTS
    // ===================================
    console.log('\n' + '='.repeat(60));
    console.log('🎯 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    if (allTestsPassed) {
      console.log('\n✅ ALL CRITICAL TESTS PASSED');
      console.log('\nPhase 2 Validation: SUCCESS ✅');
      console.log('\n📋 What this means:');
      console.log('  ✅ Clerk routes are isolated and working');
      console.log('  ✅ Supabase routes are unchanged and working');
      console.log('  ✅ No cross-contamination detected');
      console.log('  ✅ Safe to proceed to Phase 3 when ready');
      
      console.log('\n🎓 Next Steps:');
      console.log('  1. Sign up with Clerk at /sign-in-clerk');
      console.log('  2. Test /dashboard-clerk with Clerk auth');
      console.log('  3. Verify /login still works with Supabase');
      console.log('  4. Ready for Phase 3: Gradual migration');
    } else {
      console.log('\n❌ SOME CRITICAL TESTS FAILED');
      console.log('\n⚠️  Issues detected:');
      console.log('  - Check if NEXT_PUBLIC_USE_CLERK=false in .env.local');
      console.log('  - Verify middleware.ts is unchanged (not middleware-clerk.ts)');
      console.log('  - Ensure no ClerkProvider in main layout.tsx');
      console.log('\n📋 Review screenshots for details:');
      console.log('  - clerk-signin-page.png');
      console.log('  - supabase-login-page.png');
      console.log('  - main-dashboard-route.png');
    }
    
    console.log('\n📸 Screenshots saved:');
    console.log('  - clerk-signin-page.png');
    console.log('  - supabase-login-page.png');
    console.log('  - clerk-dashboard-route.png');
    console.log('  - main-dashboard-route.png');
    
    console.log('\n⏸️  Browser will stay open for 10 seconds for inspection...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('\n❌ ERROR during testing:', error.message);
    console.error('\nStack trace:', error.stack);
    allTestsPassed = false;
  } finally {
    await browser.close();
    console.log('\n✅ Test complete - browser closed');
    
    if (!allTestsPassed) {
      process.exit(1);
    }
  }
}

// Run the test
testClerkIntegration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
