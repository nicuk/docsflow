/**
 * TEST COOKIE PERSISTENCE TIMING
 * Check if cookies persist between page loads
 */

import { chromium } from 'playwright';

async function testCookiePersistence() {
  console.log('⏱️ COOKIE PERSISTENCE TEST');
  console.log('==========================');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('\n📍 STEP 1: Login');
    await page.goto('http://localhost:3001/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', 'support@bitto.tech');
    await page.fill('input[type="password"]', 'Testing123?');
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Check cookies immediately after login
    let cookies = await page.context().cookies();
    console.log('\n🍪 COOKIES AFTER LOGIN:');
    cookies.forEach(cookie => {
      console.log(`  ${cookie.name}: ${cookie.value.substring(0, 30)}... (${cookie.domain})`);
    });
    
    console.log('\n📍 STEP 2: Manual page reload test');
    await page.reload();
    await page.waitForTimeout(2000);
    
    cookies = await page.context().cookies();
    console.log('\n🍪 COOKIES AFTER RELOAD:');
    cookies.forEach(cookie => {
      console.log(`  ${cookie.name}: ${cookie.value.substring(0, 30)}... (${cookie.domain})`);
    });
    
    console.log('\n📍 STEP 3: Navigate to new page');
    
    // Monitor request headers
    let requestCookies = '';
    page.on('request', request => {
      if (request.url().includes('/dashboard')) {
        requestCookies = request.headers()['cookie'] || '';
        console.log('\n📤 REQUEST HEADERS TO /dashboard:');
        console.log('Cookie header:', requestCookies || 'NONE');
      }
    });
    
    await page.goto('http://localhost:3001/dashboard');
    await page.waitForTimeout(2000);
    
    console.log(`Final URL: ${page.url()}`);
    
    console.log('\n📍 STEP 4: Check browser storage');
    const storageInfo = await page.evaluate(() => {
      return {
        localStorage: Object.keys(localStorage).length,
        sessionStorage: Object.keys(sessionStorage).length,
        cookiesFromDocument: document.cookie ? document.cookie.split(';').length : 0,
        documentCookie: document.cookie.substring(0, 100)
      };
    });
    
    console.log('Browser storage:', storageInfo);
    
    console.log('\n📍 STEP 5: Direct cookie check via JavaScript');
    const jsCheck = await page.evaluate(() => {
      // Try to manually get cookies
      const allCookies = document.cookie;
      const cookieArray = allCookies ? allCookies.split(';').map(c => c.trim()) : [];
      
      return {
        documentCookieLength: allCookies.length,
        cookieCount: cookieArray.length,
        hasSbToken: allCookies.includes('sb-'),
        firstFewCookies: cookieArray.slice(0, 3)
      };
    });
    
    console.log('JavaScript cookie check:', jsCheck);
    
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testCookiePersistence().catch(console.error);
