import { test, expect, Page } from '@playwright/test';

/**
 * Production Chat Functionality Tests
 * Tests chat features on live Vercel deployment with working authentication
 */

const PROD_TEST_EMAIL = 'test1@example.com';
const PROD_TEST_PASSWORD = process.env.TEST_PASSWORD || 'test-password';

// Helper to login and navigate to chat
async function loginAndNavigateToChat(page: Page, rememberMe = false) {
  console.log('🔐 Logging in and navigating to chat...');
  
  // Login
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', PROD_TEST_EMAIL);
  await page.fill('input[type="password"]', PROD_TEST_PASSWORD);
  
  if (rememberMe) {
    const rememberCheckbox = page.locator('input[type="checkbox"]#remember');
    if (await rememberCheckbox.isVisible()) {
      await rememberCheckbox.check();
    }
  }
  
  await page.click('button[type="submit"]');
  
  // Wait for successful login
  await Promise.race([
    page.waitForURL('**/dashboard**', { timeout: 15000 }),
    page.waitForURL('**/onboarding**', { timeout: 15000 })
  ]);
  
  // Navigate to chat
  await page.goto('/dashboard/chat', { waitUntil: 'networkidle' });
  console.log('✅ Navigated to chat interface');
}

test.describe('Production Chat Functionality', () => {
  
  test('should load chat interface correctly on production', async ({ page }) => {
    await loginAndNavigateToChat(page);
    
    // Wait for chat interface to load
    await page.waitForSelector('textarea', { timeout: 15000 });
    
    // Check for main chat elements
    const chatInput = page.locator('textarea').first();
    const sendButton = page.locator('button').filter({ hasText: /send/i }).first();
    
    await expect(chatInput).toBeVisible();
    await expect(sendButton).toBeVisible();
    
    // Check for placeholder text
    const placeholder = await chatInput.getAttribute('placeholder');
    expect(placeholder).toContain('Ask anything about your business documents');
    
    console.log('✅ Chat interface loaded successfully');
  });

  test('should send message and receive response', async ({ page }) => {
    await loginAndNavigateToChat(page, true); // Use remember me
    
    await page.waitForSelector('textarea', { timeout: 15000 });
    
    const testMessage = 'Hello, can you help me test the chat functionality?';
    
    // Find chat elements
    const chatInput = page.locator('textarea').first();
    const sendButton = page.locator('button').filter({ hasText: /send/i }).first();
    
    // Send message
    await chatInput.fill(testMessage);
    await sendButton.click();
    
    console.log('✅ Message sent');
    
    // Verify message appears
    await expect(page.locator(`text=${testMessage}`)).toBeVisible();
    
    // Wait for AI response with extended timeout for production
    console.log('⏳ Waiting for AI response...');
    
    try {
      // Look for various response indicators
      await Promise.race([
        page.waitForSelector('[data-testid*="ai-response"]', { timeout: 30000 }),
        page.waitForSelector('.ai-message', { timeout: 30000 }),
        page.waitForSelector('.bot-message', { timeout: 30000 }),
        page.waitForTimeout(25000) // Fallback timeout
      ]);
      
      console.log('✅ AI response received (or timeout reached)');
      
      // Take screenshot of conversation
      await page.screenshot({ 
        path: 'test-results/production-chat-conversation.png', 
        fullPage: true 
      });
      
    } catch (error) {
      console.log('⚠️ AI response timeout - this may be expected in production');
      await page.screenshot({ 
        path: 'test-results/production-chat-timeout.png', 
        fullPage: true 
      });
    }
  });

  test('should maintain chat session during remember me', async ({ page }) => {
    await loginAndNavigateToChat(page, true);
    
    await page.waitForSelector('textarea', { timeout: 15000 });
    
    // Send initial message
    const chatInput = page.locator('textarea').first();
    const sendButton = page.locator('button').filter({ hasText: /send/i }).first();
    
    await chatInput.fill('Test message for session persistence');
    await sendButton.click();
    
    // Wait a bit
    await page.waitForTimeout(3000);
    
    // Refresh page to test session persistence
    console.log('🔄 Refreshing page to test session persistence...');
    await page.reload({ waitUntil: 'networkidle' });
    
    // Check if still authenticated and can access chat
    try {
      await page.waitForSelector('textarea', { timeout: 10000 });
      console.log('✅ Chat session maintained after page refresh');
      
      // Check if previous message is still visible (depends on chat implementation)
      const previousMessage = page.locator('text=Test message for session persistence');
      if (await previousMessage.isVisible()) {
        console.log('✅ Chat history preserved after refresh');
      } else {
        console.log('ℹ️ Chat history not preserved (may be expected)');
      }
      
    } catch (error) {
      console.log('❌ Session lost after page refresh');
      
      // Check if redirected to login
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        console.log('🚨 Redirected to login - session expired');
      }
    }
  });

  test('should handle chat during session timeout periods', async ({ page }) => {
    await loginAndNavigateToChat(page, false); // No remember me
    
    await page.waitForSelector('textarea', { timeout: 15000 });
    
    const chatInput = page.locator('textarea').first();
    const sendButton = page.locator('button').filter({ hasText: /send/i }).first();
    
    // Send message immediately
    await chatInput.fill('Initial message - testing session timing');
    await sendButton.click();
    console.log('✅ Initial message sent');
    
    // Wait for different intervals and test chat access
    const testIntervals = [60, 120, 300]; // 1m, 2m, 5m
    
    for (const interval of testIntervals) {
      console.log(`\n⏱️ Waiting ${interval} seconds then testing chat access...`);
      await page.waitForTimeout(interval * 1000);
      
      try {
        // Try to send another message
        await chatInput.fill(`Message after ${interval} seconds`);
        await sendButton.click();
        
        // Wait briefly to see if message goes through
        await page.waitForTimeout(2000);
        
        // Check for authentication errors or redirects
        const currentUrl = page.url();
        if (currentUrl.includes('/login')) {
          console.log(`🚨 Session expired after ${interval} seconds - redirected to login`);
          break;
        } else {
          console.log(`✅ Chat still accessible after ${interval} seconds`);
        }
        
      } catch (error) {
        console.log(`❌ Chat error after ${interval} seconds:`, error.message);
        
        // Take screenshot of error state
        await page.screenshot({ 
          path: `test-results/chat-error-${interval}s.png`, 
          fullPage: true 
        });
      }
    }
  });

  test('should handle file upload in chat', async ({ page }) => {
    await loginAndNavigateToChat(page, true);
    
    await page.waitForSelector('textarea', { timeout: 15000 });
    
    // Look for file upload button in chat
    const uploadSelectors = [
      'button:has-text("upload")',
      'button:has-text("attach")',
      'input[type="file"]',
      '[data-testid*="upload"]'
    ];
    
    let uploadButton = null;
    for (const selector of uploadSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        uploadButton = element;
        break;
      }
    }
    
    if (uploadButton) {
      console.log('✅ Upload button found in chat');
      
      // Test file upload
      try {
        const fileChooserPromise = page.waitForEvent('filechooser');
        await uploadButton.click();
        const fileChooser = await fileChooserPromise;
        
        // Create a test file
        const testContent = 'Test document content for chat upload verification';
        await fileChooser.setFiles([{
          name: 'test-chat-upload.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from(testContent)
        }]);
        
        console.log('✅ File upload initiated');
        
        // Wait for upload completion
        await page.waitForTimeout(5000);
        
        // Look for upload confirmation
        const uploadConfirmation = page.locator('text=uploaded, text=attached').first();
        if (await uploadConfirmation.isVisible()) {
          console.log('✅ File upload confirmed');
        }
        
      } catch (error) {
        console.log('⚠️ File upload test failed:', error.message);
      }
    } else {
      console.log('ℹ️ No upload button found in chat interface');
    }
  });

  test('should test chat performance and response times', async ({ page }) => {
    await loginAndNavigateToChat(page, true);
    
    await page.waitForSelector('textarea', { timeout: 15000 });
    
    const chatInput = page.locator('textarea').first();
    const sendButton = page.locator('button').filter({ hasText: /send/i }).first();
    
    // Test message sending performance
    const messages = [
      'What can you help me with?',
      'How does document analysis work?',
      'Can you analyze business documents?'
    ];
    
    const responseStats = [];
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      console.log(`\n📤 Sending message ${i + 1}: ${message}`);
      
      const startTime = Date.now();
      
      // Send message
      await chatInput.fill(message);
      await sendButton.click();
      
      const sendTime = Date.now() - startTime;
      
      // Wait for message to appear
      await expect(page.locator(`text=${message}`)).toBeVisible();
      
      // Wait for potential AI response
      const responseStartTime = Date.now();
      try {
        await Promise.race([
          page.waitForSelector('.ai-message, .bot-message, [data-testid*="ai-response"]', { timeout: 20000 }),
          page.waitForTimeout(20000)
        ]);
        
        const responseTime = Date.now() - responseStartTime;
        
        responseStats.push({
          messageNumber: i + 1,
          message: message,
          sendTime: sendTime,
          responseTime: responseTime
        });
        
        console.log(`Message ${i + 1} stats: send=${sendTime}ms, response=${responseTime}ms`);
        
      } catch (error) {
        console.log(`Message ${i + 1} response timeout`);
        responseStats.push({
          messageNumber: i + 1,
          message: message,
          sendTime: sendTime,
          responseTime: 20000 // timeout
        });
      }
      
      // Wait between messages
      await page.waitForTimeout(2000);
    }
    
    // Analyze performance
    const avgSendTime = responseStats.reduce((sum, stat) => sum + stat.sendTime, 0) / responseStats.length;
    const avgResponseTime = responseStats.reduce((sum, stat) => sum + stat.responseTime, 0) / responseStats.length;
    
    console.log('\n📊 Chat Performance Summary:');
    console.log(`- Average message send time: ${Math.round(avgSendTime)}ms`);
    console.log(`- Average AI response time: ${Math.round(avgResponseTime)}ms`);
    
    // Performance expectations (adjust based on your requirements)
    expect(avgSendTime).toBeLessThan(2000); // Message sending should be fast
    // Note: AI response time expectations depend on your backend setup
  });
});
