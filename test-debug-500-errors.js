/**
 * DEBUG 500 ERRORS
 * Capture exactly which routes are returning 500 errors
 */

import { chromium } from 'playwright';

async function debug500Errors() {
  console.log('🔍 DEBUGGING 500 ERRORS');
  console.log('=======================');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true,
    slowMo: 500
  });
  
  const page = await browser.newPage();
  
  // Capture ALL network requests and responses
  const failedRequests = [];
  
  page.on('response', async response => {
    if (response.status() >= 500) {
      console.log(`❌ 500 ERROR: ${response.status()} ${response.url()}`);
      try {
        const text = await response.text();
        failedRequests.push({
          url: response.url(),
          status: response.status(),
          error: text.substring(0, 500)
        });
        console.log(`Error details: ${text.substring(0, 200)}...`);
      } catch (e) {
        console.log('Could not read error response');
      }
    } else if (response.url().includes('/api/')) {
      console.log(`✅ API OK: ${response.status()} ${response.url().split('/').pop()}`);
    }
  });
  
  page.on('requestfailed', request => {
    console.log(`🚫 REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText}`);
  });
  
  try {
    console.log('\n📍 STEP 1: Navigate to login page');
    await page.goto('http://localhost:3001/login');
    await page.waitForLoadState('networkidle');
    
    console.log('\n📍 STEP 2: Login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'Testing123?');
    await page.click('button[type="submit"]');
    
    console.log('\n📍 STEP 3: Wait and analyze errors');
    await page.waitForTimeout(5000);
    
    console.log('\n📋 FAILED REQUESTS SUMMARY:');
    failedRequests.forEach((req, i) => {
      console.log(`${i + 1}. ${req.url} (${req.status})`);
      console.log(`   Error: ${req.error.substring(0, 100)}...`);
    });
    
    // Try manual navigation to dashboard
    console.log('\n📍 STEP 4: Manual dashboard navigation');
    await page.goto('http://localhost:3001/dashboard');
    await page.waitForTimeout(3000);
    
    const finalUrl = page.url();
    console.log(`Final URL: ${finalUrl}`);
    
    if (finalUrl.includes('/dashboard')) {
      console.log('✅ Dashboard accessible via direct navigation');
    } else {
      console.log('❌ Dashboard redirect even on direct navigation');
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

debug500Errors().catch(console.error);
