/**
 * TEST LOGIN WITH LONGER WAIT
 * Wait longer for the 1.5 second delay + redirect
 */

import { chromium } from 'playwright';

async function testLoginWithLongerWait() {
  console.log('🔍 TESTING LOGIN WITH LONGER WAIT');
  console.log('=================================');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true,
    slowMo: 500
  });
  
  const page = await browser.newPage();
  
  // Capture console messages for debugging
  page.on('console', msg => {
    console.log(`🌐 Browser Console [${msg.type()}]:`, msg.text());
  });
  
  // Monitor network requests
  page.on('response', async response => {
    if (response.url().includes('/api/auth/login')) {
      console.log(`📥 LOGIN API: ${response.status()}`);
      if (response.ok()) {
        try {
          const json = await response.json();
          console.log('✅ Login API Success:', {
            success: json.success,
            userEmail: json.user?.email,
            tenantSubdomain: json.user?.tenant?.subdomain
          });
        } catch (e) {
          console.log('✅ Login API returned 200');
        }
      }
    }
  });
  
  try {
    console.log('\n📍 STEP 1: Navigate to login page');
    await page.goto('http://localhost:3001/login');
    await page.waitForLoadState('networkidle');
    
    console.log('\n📍 STEP 2: Fill login form');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'Testing123?');
    
    console.log('\n📍 STEP 3: Submit form');
    await page.click('button[type="submit"]');
    
    console.log('\n📍 STEP 4: Wait for API response');
    await page.waitForTimeout(2000); // Wait for API call
    
    console.log('\n📍 STEP 5: Wait for redirect (1.5s delay + processing)');
    await page.waitForTimeout(3000); // Wait for the setTimeout delay
    
    const finalUrl = page.url();
    console.log(`Final URL after waiting: ${finalUrl}`);
    
    if (finalUrl.includes('/dashboard')) {
      console.log('🎉 SUCCESS: Successfully redirected to dashboard!');
      
      // Test if dashboard loads properly
      console.log('\n📍 STEP 6: Check dashboard content');
      await page.waitForLoadState('networkidle');
      
      const dashboardTitle = await page.title();
      console.log(`Dashboard title: ${dashboardTitle}`);
      
      // Check for any error messages
      const hasErrors = await page.locator('.error, [role="alert"], .text-red-500').count();
      console.log(`Dashboard errors found: ${hasErrors}`);
      
    } else if (finalUrl.includes('/login')) {
      console.log('❌ Still on login page after waiting');
      
      // Check for JavaScript errors or console messages
      console.log('\n📍 Checking for JavaScript errors...');
      
      // Look for success state
      const hasSuccessState = await page.evaluate(() => {
        return {
          hasSuccessClass: !!document.querySelector('.success, .text-green-500'),
          hasCheckCircle: !!document.querySelector('[data-lucide="check-circle"]'),
          bodyText: document.body.textContent?.includes('success') || document.body.textContent?.includes('Success')
        };
      });
      
      console.log('Success indicators:', hasSuccessState);
      
    } else {
      console.log(`❓ Unexpected URL: ${finalUrl}`);
    }
    
    // Keep browser open for inspection
    console.log('\n🔍 Browser staying open for 20 seconds...');
    await page.waitForTimeout(20000);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testLoginWithLongerWait().catch(console.error);
