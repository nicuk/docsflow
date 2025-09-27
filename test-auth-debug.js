/**
 * DEBUG AUTH TEST
 * More detailed test to see exactly what's happening
 */

import { chromium } from 'playwright';

async function debugTest() {
  console.log('🔍 DEBUG AUTH TEST');
  console.log('==================');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true, // Open dev tools
    slowMo: 500
  });
  
  const page = await browser.newPage();
  
  // Capture all console messages
  page.on('console', msg => {
    console.log(`🌐 Browser Console [${msg.type()}]:`, msg.text());
  });
  
  // Capture all network requests
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      console.log(`📤 API Request: ${request.method()} ${request.url()}`);
    }
  });
  
  // Capture all network responses
  page.on('response', async response => {
    if (response.url().includes('/api/')) {
      console.log(`📥 API Response: ${response.status()} ${response.url()}`);
      try {
        const text = await response.text();
        console.log(`📄 Response body:`, text.substring(0, 200) + (text.length > 200 ? '...' : ''));
      } catch (e) {
        console.log(`📄 Could not read response body`);
      }
    }
  });
  
  try {
    console.log('📍 Step 1: Navigate to login page');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    
    // Check if login form exists
    const emailField = await page.locator('input[type="email"], input[name="email"], #email').first();
    const passwordField = await page.locator('input[type="password"], input[name="password"], #password').first();
    const submitButton = await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In"), form button').first();
    
    console.log('📍 Step 2: Check form elements');
    console.log(`Email field exists: ${await emailField.count() > 0}`);
    console.log(`Password field exists: ${await passwordField.count() > 0}`);
    console.log(`Submit button exists: ${await submitButton.count() > 0}`);
    
    if (await emailField.count() === 0) {
      console.log('❌ No email field found! Checking page content...');
      console.log(await page.content());
      return;
    }
    
    console.log('📍 Step 3: Fill credentials');
    await emailField.fill('support@bitto.tech');
    await passwordField.fill('Testing123?');
    
    console.log('📍 Step 4: Submit form');
    await submitButton.click();
    
    console.log('📍 Step 5: Wait for response...');
    await page.waitForTimeout(5000);
    
    console.log(`📍 Final URL: ${page.url()}`);
    
    // Check for any error messages on the page
    const errorMessages = await page.locator('.error, [role="alert"], .alert, .text-red-500').allTextContents();
    if (errorMessages.length > 0) {
      console.log('❌ Error messages found:', errorMessages);
    }
    
    // Keep browser open for manual inspection
    console.log('🔍 Browser will stay open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

debugTest().catch(console.error);
