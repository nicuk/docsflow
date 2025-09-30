/**
 * Test Clerk Session Persistence
 * 
 * Opens browser and checks if Clerk session persists
 */

const { chromium } = require('playwright');

async function testClerkSession() {
  console.log('🧪 Testing Clerk Session Persistence\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Step 1: Navigate to sign-in
    console.log('📋 Step 1: Going to /sign-in-clerk');
    await page.goto('http://localhost:3000/sign-in-clerk');
    await page.waitForLoadState('networkidle');
    
    console.log('✅ Page loaded');
    console.log('⏸️  Please sign in manually in the browser...');
    console.log('   After you sign in and see the dashboard,');
    console.log('   the test will check cookies and session.\n');
    
    // Wait for navigation to dashboard-clerk (indicating successful sign-in)
    console.log('⏳ Waiting for sign-in... (will detect when you reach dashboard)');
    
    await page.waitForURL('**/dashboard-clerk**', { timeout: 120000 }); // 2 minute timeout
    
    console.log('\n✅ Sign-in detected! You reached /dashboard-clerk');
    
    // Wait a moment for page to fully load
    await page.waitForTimeout(2000);
    
    // Check cookies
    const cookies = await page.context().cookies();
    const clerkCookies = cookies.filter(c => c.name.includes('clerk') || c.name.startsWith('__clerk') || c.name.startsWith('__session'));
    
    console.log('\n🍪 CLERK COOKIES:');
    if (clerkCookies.length > 0) {
      clerkCookies.forEach(c => {
        console.log(`  ✅ ${c.name}:`);
        console.log(`     Domain: ${c.domain}`);
        console.log(`     Path: ${c.path}`);
        console.log(`     Secure: ${c.secure}`);
        console.log(`     SameSite: ${c.sameSite}`);
      });
    } else {
      console.log('  ⚠️  NO CLERK COOKIES FOUND!');
      console.log('     This means Clerk session is not persisting');
    }
    
    // Check if still on dashboard
    const currentUrl = page.url();
    console.log(`\n🔍 Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('dashboard-clerk')) {
      console.log('✅ Still on dashboard - session working!');
    } else if (currentUrl.includes('login')) {
      console.log('❌ Redirected to login - session lost!');
    }
    
    // Reload page to test session persistence
    console.log('\n🔄 Reloading page to test session persistence...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const urlAfterReload = page.url();
    console.log(`🔍 URL after reload: ${urlAfterReload}`);
    
    if (urlAfterReload.includes('dashboard-clerk')) {
      console.log('✅ PASS: Session persisted after reload!');
    } else if (urlAfterReload.includes('login') || urlAfterReload.includes('sign-in')) {
      console.log('❌ FAIL: Session lost after reload - redirected to login!');
      console.log('   This confirms Clerk session is not persisting.');
    }
    
    console.log('\n⏸️  Browser will stay open for 30 seconds for inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    await browser.close();
    console.log('\n✅ Test complete');
  }
}

testClerkSession().catch(console.error);
