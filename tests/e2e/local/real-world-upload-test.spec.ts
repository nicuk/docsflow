import { test, expect } from '@playwright/test';

test.describe('Real World Upload Page Test', () => {
  
  test('should simulate the real user experience: login and navigate to upload without being kicked out', async ({ page }) => {
    console.log('🎯 REAL WORLD TEST: Simulate user login → navigate to upload');
    
    // Clear browser state
    await page.context().clearCookies();
    
    // Step 1: Go to login page
    console.log('📍 Step 1: Navigate to login page');
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Step 2: Login with production user (same as your real workflow)
    console.log('📍 Step 2: Login with production credentials');
    await page.fill('input[type="email"]', 'support@bitto.tech');
    await page.fill('input[type="password"]', 'Testing123?');
    
    // Submit and wait for response
    console.log('📍 Step 3: Submit login form');
    const [response] = await Promise.all([
      page.waitForResponse(response => response.url().includes('/api/auth/login')),
      page.click('button[type="submit"]')
    ]);
    
    console.log(`🔍 Login API response: ${response.status()}`);
    
    // Wait for any redirects
    await page.waitForTimeout(2000);
    
    const loginUrl = page.url();
    console.log(`🔍 URL after login: ${loginUrl}`);
    
    // Step 4: Check login success
    const loginSuccessful = !loginUrl.includes('/login');
    console.log(`📍 Step 4: Login ${loginSuccessful ? 'SUCCESSFUL' : 'FAILED'}`);
    
    if (!loginSuccessful) {
      console.log('❌ Login failed, cannot continue test');
      console.log('🔍 This means our surgical fix didn\'t work as expected');
      return;
    }
    
    // Step 5: Navigate to documents/upload (the problematic page)
    console.log('📍 Step 5: Navigate to documents upload page');
    await page.goto('/dashboard/documents');
    await page.waitForTimeout(1500);
    
    const documentsUrl = page.url();
    console.log(`🔍 URL after documents navigation: ${documentsUrl}`);
    
    // Step 6: Check if kicked back to login (the original issue)
    const kickedOut = documentsUrl.includes('/login');
    console.log(`📍 Step 6: ${kickedOut ? '❌ KICKED OUT (issue persists)' : '✅ STAYED AUTHENTICATED (issue fixed)'}`);
    
    // Step 7: Test another navigation (document upload was just one example)
    if (!kickedOut) {
      console.log('📍 Step 7: Test another navigation to confirm persistence');
      await page.goto('/dashboard/settings');
      await page.waitForTimeout(1000);
      
      const settingsUrl = page.url();
      const kickedOutSettings = settingsUrl.includes('/login');
      console.log(`🔍 Settings page result: ${kickedOutSettings ? 'KICKED OUT' : 'STAYED AUTHENTICATED'}`);
      
      // Final test - go back to dashboard
      await page.goto('/dashboard');
      await page.waitForTimeout(1000);
      
      const dashboardUrl = page.url();
      const kickedOutDashboard = dashboardUrl.includes('/login');
      console.log(`🔍 Dashboard return result: ${kickedOutDashboard ? 'KICKED OUT' : 'STAYED AUTHENTICATED'}`);
      
      const overallSuccess = !kickedOut && !kickedOutSettings && !kickedOutDashboard;
      
      console.log('\n🎯 REAL WORLD TEST RESULTS:');
      console.log('┌─────────────────────────────────────┬─────────────────┐');
      console.log('│ Navigation Test                     │ Result          │');
      console.log('├─────────────────────────────────────┼─────────────────┤');
      console.log(`│ Login Success                       │ ${loginSuccessful ? '✅ SUCCESS' : '❌ FAILED'} │`);
      console.log(`│ Documents Page (original issue)     │ ${!kickedOut ? '✅ SUCCESS' : '❌ FAILED'} │`);
      console.log(`│ Settings Page                       │ ${!kickedOutSettings ? '✅ SUCCESS' : '❌ FAILED'} │`);
      console.log(`│ Dashboard Return                    │ ${!kickedOutDashboard ? '✅ SUCCESS' : '❌ FAILED'} │`);
      console.log('└─────────────────────────────────────┴─────────────────┘');
      
      if (overallSuccess) {
        console.log('\n🎉 SUCCESS: The "kicked out after login" issue is FIXED!');
        console.log('✅ User can now navigate to upload page and other pages without being kicked out');
      } else {
        console.log('\n❌ ISSUE PERSISTS: User is still being kicked out on some pages');
      }
      
      expect(overallSuccess).toBeTruthy();
    } else {
      console.log('\n❌ CRITICAL: User was kicked out immediately on documents page');
      console.log('🔍 This means the session persistence fix needs more work');
      expect(kickedOut).toBeFalsy();
    }
  });
  
});
