/**
 * SIMPLE BROWSER TEST
 * Just check what's actually on the login page
 */

import { chromium } from 'playwright';

async function simpleBrowserTest() {
  console.log('🔍 SIMPLE BROWSER TEST');
  console.log('======================');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true,
    slowMo: 2000
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('📍 Navigate to login page');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    
    console.log('📍 Check page title and URL');
    console.log(`Title: ${await page.title()}`);
    console.log(`URL: ${page.url()}`);
    
    console.log('📍 Look for form elements');
    
    // Check for various input selectors
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]', 
      '#email',
      '[placeholder*="email" i]',
      '[placeholder*="Email" i]'
    ];
    
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      '#password',
      '[placeholder*="password" i]',
      '[placeholder*="Password" i]'
    ];
    
    const buttonSelectors = [
      'button[type="submit"]',
      'button:has-text("Login")',
      'button:has-text("Sign In")',
      'button:has-text("Log In")',
      '[type="submit"]'
    ];
    
    console.log('\n📍 Testing email field selectors:');
    for (const selector of emailSelectors) {
      const count = await page.locator(selector).count();
      console.log(`  ${selector}: ${count} found`);
    }
    
    console.log('\n📍 Testing password field selectors:');
    for (const selector of passwordSelectors) {
      const count = await page.locator(selector).count();
      console.log(`  ${selector}: ${count} found`);
    }
    
    console.log('\n📍 Testing button selectors:');
    for (const selector of buttonSelectors) {
      const count = await page.locator(selector).count();
      console.log(`  ${selector}: ${count} found`);
    }
    
    console.log('\n📍 Get all form elements:');
    const formElements = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const buttons = Array.from(document.querySelectorAll('button'));
      const forms = Array.from(document.querySelectorAll('form'));
      
      return {
        inputs: inputs.map(i => ({
          type: i.type,
          name: i.name,
          id: i.id,
          placeholder: i.placeholder,
          className: i.className
        })),
        buttons: buttons.map(b => ({
          type: b.type,
          textContent: b.textContent?.trim(),
          className: b.className
        })),
        forms: forms.length,
        bodyText: document.body.textContent?.substring(0, 500)
      };
    });
    
    console.log('Form elements found:', JSON.stringify(formElements, null, 2));
    
    // Keep browser open for manual inspection
    console.log('\n🔍 Browser will stay open for 60 seconds for inspection...');
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

simpleBrowserTest().catch(console.error);
