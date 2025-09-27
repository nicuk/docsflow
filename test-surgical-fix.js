/**
 * TEST SURGICAL FIX
 * Verify cookie domain fix resolves authentication
 */

import { chromium } from 'playwright';

async function testSurgicalFix() {
  console.log('🔧 SURGICAL FIX TEST');
  console.log('===================');
  
  const browser = await chromium.launch({ 
    headless: false
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('\n📍 STEP 1: Login with fixed cookie domain');
    await page.goto('http://localhost:3001/login');
    await page.fill('input[type="email"]', 'support@bitto.tech');
    await page.fill('input[type="password"]', 'Testing123?');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    console.log('\n📍 STEP 2: Check cookie domain');
    const cookies = await page.context().cookies();
    const supabaseCookie = cookies.find(c => c.name.startsWith('sb-'));
    
    if (supabaseCookie) {
      console.log('✅ Supabase cookie found');
      console.log('Domain:', supabaseCookie.domain);
      console.log('Should be .localhost for development');
    }
    
    console.log('\n📍 STEP 3: Navigate to dashboard');
    await page.goto('http://localhost:3001/dashboard');
    await page.waitForTimeout(5000);
    
    const finalUrl = page.url();
    console.log('Final URL:', finalUrl);
    
    if (finalUrl.includes('/dashboard') && !finalUrl.includes('/onboarding')) {
      console.log('✅ SUCCESS: Stayed on dashboard!');
    } else if (finalUrl.includes('/onboarding')) {
      console.log('⚠️ PARTIAL: Redirected to onboarding (expected for first-time users)');
    } else {
      console.log('❌ FAILED: Unexpected redirect');
    }
    
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testSurgicalFix().catch(console.error);
