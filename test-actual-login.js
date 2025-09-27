/**
 * TEST ACTUAL LOGIN
 * Now that we know the server is running, test the actual login flow
 */

import { chromium } from 'playwright';

async function testActualLogin() {
  console.log('🔍 TESTING ACTUAL LOGIN');
  console.log('=======================');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: false,
    slowMo: 1000
  });
  
  const page = await browser.newPage();
  
  // Monitor network requests
  page.on('response', async response => {
    if (response.url().includes('/api/auth/login')) {
      console.log(`📥 LOGIN API: ${response.status()}`);
      if (response.ok()) {
        try {
          const json = await response.json();
          console.log('✅ Login Success:', {
            success: json.success,
            userEmail: json.user?.email,
            tenantSubdomain: json.user?.tenant?.subdomain
          });
        } catch (e) {
          console.log('✅ Login API returned 200');
        }
      } else {
        const text = await response.text();
        console.log('❌ Login API Error:', text.substring(0, 200));
      }
    }
  });
  
  try {
    console.log('\n📍 STEP 1: Navigate to login page');
    await page.goto('http://localhost:3001/login');
    await page.waitForLoadState('networkidle');
    
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
    if (title.includes('404')) {
      console.log('❌ Login page still returns 404');
      return;
    }
    
    console.log('\n📍 STEP 2: Look for login form');
    
    // Wait for form to load
    await page.waitForTimeout(2000);
    
    // Try different selectors
    const emailField = await page.locator('input[type="email"], input[name="email"], [placeholder*="email" i]').first();
    const passwordField = await page.locator('input[type="password"], input[name="password"], [placeholder*="password" i]').first();
    const submitButton = await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In"), button:has-text("Log In")').first();
    
    const emailCount = await emailField.count();
    const passwordCount = await passwordField.count();
    const buttonCount = await submitButton.count();
    
    console.log(`Email fields found: ${emailCount}`);
    console.log(`Password fields found: ${passwordCount}`);
    console.log(`Submit buttons found: ${buttonCount}`);
    
    if (emailCount === 0 || passwordCount === 0 || buttonCount === 0) {
      console.log('❌ Login form elements not found');
      
      // Get page content for debugging
      const content = await page.evaluate(() => {
        return {
          hasForm: !!document.querySelector('form'),
          inputCount: document.querySelectorAll('input').length,
          buttonCount: document.querySelectorAll('button').length,
          bodyText: document.body.textContent?.substring(0, 300)
        };
      });
      
      console.log('Page analysis:', content);
      
      // Keep browser open for inspection
      console.log('\n🔍 Browser staying open for inspection...');
      await page.waitForTimeout(30000);
      return;
    }
    
    console.log('\n📍 STEP 3: Fill login form');
    await emailField.fill('test@example.com');
    await passwordField.fill('Testing123?');
    
    console.log('\n📍 STEP 4: Submit form');
    await submitButton.click();
    
    console.log('\n📍 STEP 5: Wait for response');
    await page.waitForTimeout(5000);
    
    const finalUrl = page.url();
    console.log(`Final URL: ${finalUrl}`);
    
    if (finalUrl.includes('/dashboard')) {
      console.log('🎉 SUCCESS: Redirected to dashboard!');
    } else if (finalUrl.includes('/login')) {
      console.log('❌ Still on login page - check for errors');
      
      // Look for error messages
      const errorElements = await page.locator('.error, [role="alert"], .text-red-500, .alert-error').allTextContents();
      if (errorElements.length > 0) {
        console.log('Error messages:', errorElements);
      }
    } else {
      console.log(`❓ Unexpected redirect: ${finalUrl}`);
    }
    
    // Keep browser open for inspection
    console.log('\n🔍 Browser staying open for 30 seconds...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testActualLogin().catch(console.error);
