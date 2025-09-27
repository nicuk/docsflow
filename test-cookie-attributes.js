/**
 * TEST COOKIE ATTRIBUTES
 * Check detailed cookie attributes to find why they're not sent
 */

import { chromium } from 'playwright';

async function testCookieAttributes() {
  console.log('🔍 COOKIE ATTRIBUTES TEST');
  console.log('=========================');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('\n📍 STEP 1: Login and capture detailed cookie info');
    await page.goto('http://localhost:3001/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', 'support@bitto.tech');
    await page.fill('input[type="password"]', 'Testing123?');
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Get detailed cookie information
    const cookies = await page.context().cookies();
    const supabaseCookie = cookies.find(c => c.name.startsWith('sb-'));
    
    if (supabaseCookie) {
      console.log('\n🍪 SUPABASE COOKIE DETAILS:');
      console.log('Name:', supabaseCookie.name);
      console.log('Domain:', supabaseCookie.domain);
      console.log('Path:', supabaseCookie.path);
      console.log('Secure:', supabaseCookie.secure);
      console.log('HttpOnly:', supabaseCookie.httpOnly);
      console.log('SameSite:', supabaseCookie.sameSite);
      console.log('Expires:', supabaseCookie.expires);
      console.log('Value length:', supabaseCookie.value.length);
    }
    
    console.log('\n📍 STEP 2: Test different navigation methods');
    
    // Method 1: Direct navigation
    console.log('\n🔗 Method 1: Direct page.goto()');
    let cookiesSent = false;
    
    page.on('request', request => {
      if (request.url().includes('/dashboard')) {
        const cookieHeader = request.headers()['cookie'];
        console.log('Cookies sent:', cookieHeader ? 'YES' : 'NO');
        if (cookieHeader) {
          console.log('Cookie header length:', cookieHeader.length);
        }
        cookiesSent = !!cookieHeader;
      }
    });
    
    await page.goto('http://localhost:3001/dashboard');
    await page.waitForTimeout(1000);
    
    console.log('Result URL:', page.url());
    console.log('Cookies were sent:', cookiesSent);
    
    // Method 2: Click navigation
    console.log('\n🔗 Method 2: Click navigation');
    await page.goto('http://localhost:3001/login');
    await page.waitForTimeout(1000);
    
    // Create a link and click it
    await page.evaluate(() => {
      const link = document.createElement('a');
      link.href = '/dashboard';
      link.textContent = 'Go to Dashboard';
      link.id = 'dashboard-link';
      document.body.appendChild(link);
    });
    
    cookiesSent = false;
    await page.click('#dashboard-link');
    await page.waitForTimeout(2000);
    
    console.log('Click result URL:', page.url());
    console.log('Cookies were sent via click:', cookiesSent);
    
    // Method 3: Form submission
    console.log('\n🔗 Method 3: Form submission');
    await page.goto('http://localhost:3001/login');
    await page.waitForTimeout(1000);
    
    await page.evaluate(() => {
      const form = document.createElement('form');
      form.method = 'GET';
      form.action = '/dashboard';
      const button = document.createElement('button');
      button.type = 'submit';
      button.textContent = 'Submit to Dashboard';
      button.id = 'form-submit';
      form.appendChild(button);
      document.body.appendChild(form);
    });
    
    cookiesSent = false;
    await page.click('#form-submit');
    await page.waitForTimeout(2000);
    
    console.log('Form result URL:', page.url());
    console.log('Cookies were sent via form:', cookiesSent);
    
    // Check browser network tab
    console.log('\n📍 STEP 3: Browser DevTools check');
    console.log('Open DevTools Network tab and check the /dashboard request manually');
    
    await page.waitForTimeout(15000);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testCookieAttributes().catch(console.error);
