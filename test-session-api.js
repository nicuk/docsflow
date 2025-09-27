/**
 * TEST SESSION API DIRECTLY
 * Check what data the session API returns after login
 */

import { chromium } from 'playwright';

async function testSessionAPI() {
  console.log('🔍 SESSION API TEST');
  console.log('==================');
  
  const browser = await chromium.launch({ 
    headless: false
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('\n📍 STEP 1: Login');
    await page.goto('http://localhost:3001/login');
    await page.fill('input[type="email"]', 'support@bitto.tech');
    await page.fill('input[type="password"]', 'Testing123?');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    console.log('\n📍 STEP 2: Test session API directly');
    
    // Call session API and capture response
    const sessionResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          credentials: 'include'
        });
        
        const data = await response.json();
        
        return {
          status: response.status,
          data: data,
          headers: Object.fromEntries(response.headers.entries())
        };
      } catch (error) {
        return {
          error: error.message
        };
      }
    });
    
    console.log('\n🔍 SESSION API RESPONSE:');
    console.log('Status:', sessionResponse.status);
    
    if (sessionResponse.data) {
      console.log('\n📊 SESSION DATA:');
      console.log('- authenticated:', sessionResponse.data.authenticated);
      console.log('- onboardingComplete:', sessionResponse.data.onboardingComplete);
      console.log('- user email:', sessionResponse.data.user?.email);
      console.log('- tenant subdomain:', sessionResponse.data.tenant?.subdomain);
      console.log('- tenant id:', sessionResponse.data.tenant?.id?.substring(0, 8) + '...');
      
      console.log('\n📋 FULL SESSION OBJECT:');
      console.log(JSON.stringify(sessionResponse.data, null, 2));
    }
    
    if (sessionResponse.error) {
      console.log('❌ ERROR:', sessionResponse.error);
    }
    
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testSessionAPI().catch(console.error);
