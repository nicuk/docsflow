/**
 * TEST COOKIE PERSISTENCE
 * Debug exactly what cookies are set and readable
 */

import { chromium } from 'playwright';

async function testCookieDebug() {
  console.log('🍪 COOKIE DEBUG TEST');
  console.log('===================');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('\n📍 STEP 1: Login and capture cookies');
    await page.goto('http://localhost:3001/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', 'support@bitto.tech');
    await page.fill('input[type="password"]', 'Testing123?');
    
    // Capture login response
    const loginPromise = page.waitForResponse(response => 
      response.url().includes('/api/auth/login')
    );
    
    await page.click('button[type="submit"]');
    const loginResponse = await loginPromise;
    
    console.log(`Login status: ${loginResponse.status()}`);
    
    // Check Set-Cookie headers from login API
    const setCookieHeaders = loginResponse.headers()['set-cookie'];
    if (setCookieHeaders) {
      console.log('\n🍪 SET-COOKIE HEADERS FROM LOGIN API:');
      setCookieHeaders.split(',').forEach((cookie, i) => {
        console.log(`  ${i + 1}: ${cookie.trim()}`);
      });
    }
    
    // Wait for any redirects/JS to complete
    await page.waitForTimeout(2000);
    
    // Get all cookies from browser context
    const allCookies = await page.context().cookies();
    console.log('\n🍪 ALL COOKIES IN BROWSER:');
    allCookies.forEach(cookie => {
      console.log(`  ${cookie.name}: ${cookie.value.substring(0, 50)}... (domain: ${cookie.domain})`);
    });
    
    // Test middleware by navigating to dashboard
    console.log('\n📍 STEP 2: Test middleware cookie reading');
    
    // Capture middleware request
    page.on('request', request => {
      if (request.url().includes('/dashboard')) {
        const cookieHeader = request.headers()['cookie'];
        console.log('\n🍪 COOKIE HEADER SENT TO MIDDLEWARE:');
        console.log(cookieHeader || 'NO COOKIES SENT');
        
        if (cookieHeader) {
          const cookies = cookieHeader.split(';').map(c => c.trim());
          console.log('\n🍪 PARSED COOKIES:');
          cookies.forEach(cookie => {
            const [name, value] = cookie.split('=');
            console.log(`  ${name}: ${value?.substring(0, 30)}...`);
          });
        }
      }
    });
    
    await page.goto('http://localhost:3001/dashboard');
    await page.waitForTimeout(3000);
    
    console.log(`Final URL: ${page.url()}`);
    
    // Keep open for inspection
    console.log('\n🔍 Browser staying open for 30 seconds...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testCookieDebug().catch(console.error);
