/**
 * SIMPLE MIDDLEWARE LOG TEST
 * Just login and navigate to see middleware behavior
 */

import { chromium } from 'playwright';

async function testMiddlewareLogs() {
  console.log('📋 MIDDLEWARE LOG TEST');
  console.log('=====================');
  
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
    
    console.log('\n📍 STEP 2: Navigate to dashboard (check server logs)');
    await page.goto('http://localhost:3001/dashboard');
    await page.waitForTimeout(3000);
    
    console.log('Final URL:', page.url());
    console.log('\n✅ Check the server terminal for middleware logs');
    
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testMiddlewareLogs().catch(console.error);
