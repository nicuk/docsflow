/**
 * FULL FLOW TEST
 * Test login -> upload -> chat interface
 */

import { chromium } from 'playwright';

async function testFullFlow() {
  console.log('🔄 TESTING FULL FLOW');
  console.log('====================');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: false,
    slowMo: 1000
  });
  
  const page = await browser.newPage();
  
  // Capture console logs and API responses
  page.on('console', msg => {
    if (msg.text().includes('[LOGIN]') || msg.text().includes('Error') || msg.text().includes('error')) {
      console.log(`🌐 Console:`, msg.text());
    }
  });
  
  page.on('response', async response => {
    if (response.url().includes('/api/')) {
      console.log(`📥 API: ${response.status()} ${response.url().split('/').pop()}`);
      
      if (!response.ok()) {
        try {
          const text = await response.text();
          console.log(`❌ Error Response:`, text.substring(0, 200));
        } catch (e) {
          console.log(`❌ Could not read error response`);
        }
      }
    }
  });

  try {
    console.log('\n📍 STEP 1: Navigate to login');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    
    console.log('\n📍 STEP 2: Login');
    await page.fill('input[type="email"], input[name="email"]', 'support@bitto.tech');
    await page.fill('input[type="password"], input[name="password"]', 'Testing123?');
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    
    // Wait for either redirect or error
    try {
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
      console.log('✅ Successfully redirected to dashboard');
    } catch (e) {
      console.log('⏱️ No dashboard redirect, checking current page...');
      console.log(`Current URL: ${page.url()}`);
      
      // Check for error messages
      const errorText = await page.textContent('body');
      if (errorText.includes('User profile not found')) {
        console.log('❌ Still getting "User profile not found" error');
      } else if (errorText.includes('Invalid')) {
        console.log('❌ Invalid credentials error');
      }
    }
    
    // If we're still on login page, the API might be working but frontend isn't handling the response
    if (page.url().includes('/login')) {
      console.log('🔍 Still on login page - testing dashboard direct access');
      await page.goto('http://localhost:3000/dashboard');
      await page.waitForLoadState('networkidle', { timeout: 5000 });
    }
    
    console.log(`\n📍 Current URL: ${page.url()}`);
    
    if (page.url().includes('/dashboard') || page.url().includes('/upload')) {
      console.log('\n📍 STEP 3: Test Upload Page');
      
      // Navigate to upload if not already there
      if (!page.url().includes('/upload')) {
        try {
          await page.click('a[href*="upload"], a:has-text("Upload"), nav a:has-text("Documents")');
          await page.waitForLoadState('networkidle');
        } catch (e) {
          console.log('🔍 Upload link not found, trying direct navigation');
          await page.goto('http://localhost:3000/upload');
          await page.waitForLoadState('networkidle');
        }
      }
      
      console.log(`📍 Upload page URL: ${page.url()}`);
      
      // Check for upload interface
      const hasUploadInterface = await page.locator('input[type="file"], .upload-area, [data-testid*="upload"]').count() > 0;
      console.log(`✅ Upload interface present: ${hasUploadInterface}`);
      
      console.log('\n📍 STEP 4: Test Chat Interface');
      
      // Navigate to chat/conversation interface
      try {
        await page.click('a[href*="chat"], a:has-text("Chat"), a:has-text("Conversation"), nav a:has-text("Chat")');
        await page.waitForLoadState('networkidle');
      } catch (e) {
        console.log('🔍 Chat link not found, trying direct navigation');
        await page.goto('http://localhost:3000/chat');
        await page.waitForLoadState('networkidle');
      }
      
      console.log(`📍 Chat page URL: ${page.url()}`);
      
      // Check for chat interface
      const hasChatInterface = await page.locator('input[placeholder*="message"], textarea[placeholder*="message"], .chat-input, [data-testid*="chat"]').count() > 0;
      console.log(`✅ Chat interface present: ${hasChatInterface}`);
      
      if (hasChatInterface) {
        console.log('\n📍 STEP 5: Test Chat Message');
        
        const chatInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"], .chat-input').first();
        await chatInput.fill('Hello, this is a test message');
        
        try {
          await page.click('button[type="submit"], button:has-text("Send"), .send-button');
          console.log('✅ Chat message sent');
          
          // Wait a bit to see response
          await page.waitForTimeout(3000);
          
          // Check for any error messages
          const hasErrors = await page.locator('.error, [role="alert"], .text-red-500').count() > 0;
          if (hasErrors) {
            const errorText = await page.locator('.error, [role="alert"], .text-red-500').first().textContent();
            console.log(`❌ Chat error: ${errorText}`);
          } else {
            console.log('✅ No chat errors detected');
          }
          
        } catch (e) {
          console.log('❌ Could not send chat message');
        }
      }
      
      console.log('\n🎉 FULL FLOW TEST COMPLETE');
      
    } else {
      console.log('❌ Could not access dashboard - authentication still failing');
    }
    
    // Keep browser open for inspection
    console.log('\n🔍 Browser staying open for 20 seconds for inspection...');
    await page.waitForTimeout(20000);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testFullFlow().catch(console.error);
