/**
 * DEBUG LOGIN FLOW
 * Check exactly what happens during login
 */

import { chromium } from 'playwright';

async function debugLoginFlow() {
  console.log('🔍 DEBUG LOGIN FLOW');
  console.log('===================');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true,
    slowMo: 1000
  });
  
  const page = await browser.newPage();
  
  // Capture all network activity
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      console.log(`📤 REQUEST: ${request.method()} ${request.url()}`);
    }
  });
  
  page.on('response', async response => {
    if (response.url().includes('/api/auth/login')) {
      console.log(`📥 LOGIN RESPONSE: ${response.status()}`);
      const headers = response.headers();
      console.log('Set-Cookie headers:', headers['set-cookie'] || 'none');
      
      try {
        const body = await response.text();
        const json = JSON.parse(body);
        console.log('Login response:', {
          success: json.success,
          hasUser: !!json.user,
          userEmail: json.user?.email,
          tenantId: json.user?.tenant_id?.substring(0, 8) + '...',
          hasSession: !!json.session
        });
      } catch (e) {
        console.log('Could not parse login response');
      }
    }
  });
  
  try {
    console.log('\n📍 STEP 1: Navigate to login');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    
    console.log('\n📍 STEP 2: Fill credentials');
    await page.fill('input[type="email"]', 'support@bitto.tech');
    await page.fill('input[type="password"]', 'Testing123?');
    
    console.log('\n📍 STEP 3: Submit and monitor');
    
    // Click submit and wait for network activity
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForResponse(response => response.url().includes('/api/auth/login'), { timeout: 10000 })
    ]);
    
    console.log('\n📍 STEP 4: Wait for redirect or check what happened');
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    // Check if cookies were set
    const cookies = await page.context().cookies();
    const authCookies = cookies.filter(c => 
      c.name.includes('auth') || 
      c.name.includes('session') || 
      c.name.includes('tenant') ||
      c.name.startsWith('sb-')
    );
    
    console.log('\nAuth-related cookies:', authCookies.map(c => ({
      name: c.name,
      hasValue: !!c.value,
      domain: c.domain
    })));
    
    // Check for JavaScript errors or console messages
    console.log('\n📍 STEP 5: Check for JavaScript redirect logic');
    
    const redirectScript = await page.evaluate(() => {
      // Check if there's any redirect logic in the page
      const scripts = Array.from(document.scripts).map(s => s.textContent || '').join(' ');
      return {
        hasRedirectLogic: scripts.includes('redirect') || scripts.includes('router.push'),
        hasWindowLocation: scripts.includes('window.location'),
        bodyText: document.body.textContent?.substring(0, 200)
      };
    });
    
    console.log('Page analysis:', redirectScript);
    
    // Manual navigation test
    console.log('\n📍 STEP 6: Manual dashboard navigation test');
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForTimeout(2000);
    
    console.log(`Dashboard URL result: ${page.url()}`);
    
    // Keep browser open for inspection
    console.log('\n🔍 Keeping browser open for 30 seconds...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

debugLoginFlow().catch(console.error);
