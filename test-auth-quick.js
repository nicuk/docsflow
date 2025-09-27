/**
 * QUICK AUTH TEST
 * Tests our surgical SSR auth fix with better error handling
 */

import { chromium } from 'playwright';

async function quickTest() {
  console.log('🚀 QUICK AUTH TEST');
  console.log('==================');
  
  let browser;
  try {
    browser = await chromium.launch({ 
      headless: false,
      timeout: 30000
    });
    
    const page = await browser.newPage();
    
    // Set up console logging
    page.on('console', msg => {
      if (msg.text().includes('[LOGIN]') || msg.text().includes('[SSR-MIDDLEWARE]')) {
        console.log('🔍 Browser:', msg.text());
      }
    });
    
    console.log('📍 Step 1: Navigate to localhost:3000');
    
    try {
      await page.goto('http://localhost:3000/login', { 
        waitUntil: 'networkidle',
        timeout: 10000
      });
      console.log('✅ Login page loaded');
    } catch (e) {
      console.log('❌ Server not running on localhost:3000');
      console.log('💡 Run this first: npm run dev');
      return;
    }
    
    console.log('📍 Step 2: Fill credentials and submit');
    
    await page.fill('input[type="email"], [name="email"]', 'support@bitto.tech');
    await page.fill('input[type="password"], [name="password"]', 'Testing123?');
    
    // Listen for the API response
    let apiResponse = null;
    page.on('response', async (response) => {
      if (response.url().includes('/api/auth/login')) {
        apiResponse = {
          status: response.status(),
          text: await response.text().catch(() => 'Could not read')
        };
      }
    });
    
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    
    console.log('📍 Step 3: Wait for result...');
    
    // Wait a bit for the API call
    await page.waitForTimeout(3000);
    
    if (apiResponse) {
      console.log('\n📋 API RESPONSE:');
      console.log(`Status: ${apiResponse.status}`);
      
      if (apiResponse.status === 200) {
        try {
          const json = JSON.parse(apiResponse.text);
          if (json.success) {
            console.log('🎉 SUCCESS! Auth fix is working!');
            console.log(`User: ${json.user?.email}`);
            console.log(`Tenant: ${json.user?.tenant_id?.substring(0, 8)}...`);
          } else {
            console.log('❌ API returned success=false:', json.error);
          }
        } catch (e) {
          console.log('✅ Got 200 response but couldn\'t parse JSON');
        }
      } else {
        console.log('❌ API Error:', apiResponse.text);
        if (apiResponse.text.includes('User profile not found')) {
          console.log('🔍 RLS issue still exists - need to debug further');
        }
      }
    } else {
      console.log('❓ No API response detected');
    }
    
    console.log('\n📍 Current URL:', page.url());
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

quickTest().catch(console.error);
