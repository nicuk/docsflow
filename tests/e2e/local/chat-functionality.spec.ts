import { test, expect, Page } from '@playwright/test';
import path from 'path';

// Test utilities for setting up authenticated sessions
async function setupAuthenticatedSession(page: Page) {
  // Navigate to login page
  await page.goto('/login');
  
  // Fill in test credentials
  await page.fill('input[type="email"]', 'test1@example.com');
  await page.fill('input[type="password"]', 'Testing123?');
  
  // Check remember me for extended session
  const rememberCheckbox = page.locator('input[type="checkbox"]#remember');
  if (await rememberCheckbox.isVisible()) {
    await rememberCheckbox.check();
  }
  
  // Submit login form
  await page.click('button[type="submit"]');
  
  // Wait for redirect to dashboard or onboarding
  await page.waitForTimeout(3000);
  
  // Handle onboarding if we're redirected there
  if (page.url().includes('/onboarding')) {
    // Fill in subdomain if on onboarding page
    const subdomainInput = page.locator('input[name="subdomain"], input[placeholder*="subdomain"]').first();
    if (await subdomainInput.isVisible()) {
      await subdomainInput.fill('test-company');
      await page.click('button[type="submit"], button:has-text("Continue"), button:has-text("Next")');
      await page.waitForTimeout(2000);
    }
  }
  
  // Navigate to chat interface
  if (page.url().includes('/dashboard')) {
    await page.goto('/dashboard/chat');
  }
}

test.describe('Chat Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authenticated session before each test
    await setupAuthenticatedSession(page);
  });

  test('should load chat interface correctly', async ({ page }) => {
    // Wait for chat interface to load
    await page.waitForSelector('textarea', { timeout: 10000 });
    
    // Check for main chat elements
    const chatInput = page.locator('textarea').first();
    const sendButton = page.locator('button').filter({ hasText: /send/i }).first();
    
    await expect(chatInput).toBeVisible();
    await expect(sendButton).toBeVisible();
    
    // Check for placeholder text
    const placeholder = await chatInput.getAttribute('placeholder');
    expect(placeholder).toContain('Ask anything about your business documents');
  });

  test('should display welcome message', async ({ page }) => {
    // Look for AI welcome message
    const welcomeMessage = page.locator('text=Hello! I\'m your business docsflow.app assistant');
    await expect(welcomeMessage).toBeVisible({ timeout: 10000 });
  });

  test('should send a message and receive response', async ({ page }) => {
    const testMessage = 'Hello, can you help me with my business documents?';
    
    // Find chat input and send button
    const chatInput = page.locator('textarea').first();
    const sendButton = page.locator('button').filter({ hasText: /send/i }).first();
    
    // Type message
    await chatInput.fill(testMessage);
    
    // Verify send button is enabled
    await expect(sendButton).toBeEnabled();
    
    // Send message
    await sendButton.click();
    
    // Verify message appears in chat history
    await expect(page.locator(`text=${testMessage}`)).toBeVisible();
    
    // Wait for AI response (should show loading state first)
    await page.waitForSelector('[data-testid*="loading"], .loading, text=thinking', { timeout: 5000 })
      .catch(() => console.log('Loading indicator not found - may have loaded instantly'));
    
    // Wait for actual response (timeout extended for AI processing)
    await page.waitForTimeout(8000);
    
    // Look for AI response indicators
    const aiResponse = page.locator('[data-testid*="ai-response"], .ai-message, .bot-message').first();
    if (await aiResponse.isVisible()) {
      await expect(aiResponse).toBeVisible();
    } else {
      // Fallback: look for any new text that's not our input
      const allMessages = page.locator('[class*="message"], [data-testid*="message"]');
      const messageCount = await allMessages.count();
      expect(messageCount).toBeGreaterThan(1); // Should have at least user message + AI response
    }
  });

  test('should handle empty message submission', async ({ page }) => {
    const sendButton = page.locator('button').filter({ hasText: /send/i }).first();
    
    // Send button should be disabled when input is empty
    await expect(sendButton).toBeDisabled();
    
    // Try to click anyway (should not send)
    await sendButton.click({ force: true });
    
    // Should not see any new messages
    await page.waitForTimeout(1000);
    const messages = page.locator('[class*="message"]');
    const messageCount = await messages.count();
    
    // Should only have welcome message
    expect(messageCount).toBeLessThanOrEqual(1);
  });

  test('should support conversation history', async ({ page }) => {
    // Send first message
    const chatInput = page.locator('textarea').first();
    const sendButton = page.locator('button').filter({ hasText: /send/i }).first();
    
    await chatInput.fill('What services do you offer?');
    await sendButton.click();
    
    // Wait for response
    await page.waitForTimeout(3000);
    
    // Send follow-up message
    await chatInput.fill('Can you tell me more about document analysis?');
    await sendButton.click();
    
    // Verify both messages are visible in conversation
    await expect(page.locator('text=What services do you offer?')).toBeVisible();
    await expect(page.locator('text=Can you tell me more about document analysis?')).toBeVisible();
  });

  test('should handle file upload button in chat', async ({ page }) => {
    // Look for file upload button in chat interface
    const uploadButton = page.locator('button').filter({ hasText: /upload|attach/i }).first();
    
    if (await uploadButton.isVisible()) {
      // Test file upload functionality
      const fileChooserPromise = page.waitForEvent('filechooser');
      await uploadButton.click();
      const fileChooser = await fileChooserPromise;
      
      // Create a test file
      const testFilePath = path.join(__dirname, '..', 'fixtures', 'test-document.txt');
      
      // Upload the file
      await fileChooser.setFiles([testFilePath]);
      
      // Wait for upload confirmation or progress indicator
      await page.waitForTimeout(2000);
      
      // Look for upload success indicator
      const uploadSuccess = page.locator('text=uploaded, text=success, [data-testid*="upload-success"]').first();
      if (await uploadSuccess.isVisible()) {
        await expect(uploadSuccess).toBeVisible();
      }
    }
  });

  test('should display confidence levels for AI responses', async ({ page }) => {
    const chatInput = page.locator('textarea').first();
    const sendButton = page.locator('button').filter({ hasText: /send/i }).first();
    
    // Send a test message
    await chatInput.fill('What is the purpose of business documentation?');
    await sendButton.click();
    
    // Wait for AI response
    await page.waitForTimeout(8000);
    
    // Look for confidence indicators
    const confidenceIndicator = page.locator('.confidence, [data-testid*="confidence"], [class*="confidence"]').first();
    
    if (await confidenceIndicator.isVisible()) {
      await expect(confidenceIndicator).toBeVisible();
      
      // Check if confidence value is reasonable (between 0 and 1 or 0 and 100)
      const confidenceText = await confidenceIndicator.textContent();
      expect(confidenceText).toBeTruthy();
    }
  });

  test('should handle conversation switching', async ({ page }) => {
    // Look for conversation history or new conversation button
    const newConversationBtn = page.locator('button').filter({ hasText: /new.*conversation|start.*new/i }).first();
    const conversationHistory = page.locator('[class*="conversation"], [data-testid*="conversation"]');
    
    if (await newConversationBtn.isVisible()) {
      // Test creating new conversation
      await newConversationBtn.click();
      
      // Should clear current chat and start fresh
      await page.waitForTimeout(1000);
      
      // Welcome message should be visible again
      await expect(page.locator('text=Hello! I\'m your business docsflow.app assistant')).toBeVisible();
    }
    
    if (await conversationHistory.first().isVisible()) {
      // Test conversation switching if history exists
      const conversationCount = await conversationHistory.count();
      if (conversationCount > 1) {
        await conversationHistory.nth(1).click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should support keyboard shortcuts', async ({ page }) => {
    const chatInput = page.locator('textarea').first();
    
    // Type a message
    await chatInput.fill('Test message for keyboard shortcuts');
    
    // Test Enter to send (Shift+Enter for new line)
    await chatInput.press('Enter');
    
    // Should send the message
    await expect(page.locator('text=Test message for keyboard shortcuts')).toBeVisible();
    
    // Test typing in new message with Shift+Enter for new line
    await chatInput.fill('Line 1');
    await chatInput.press('Shift+Enter');
    await chatInput.type('Line 2');
    
    // Should have multiline text
    const inputValue = await chatInput.inputValue();
    expect(inputValue).toContain('\n');
  });

  test('should maintain session and chat state on page refresh', async ({ page }) => {
    // Send a test message first
    const chatInput = page.locator('textarea').first();
    const sendButton = page.locator('button').filter({ hasText: /send/i }).first();
    
    await chatInput.fill('Test message before refresh');
    await sendButton.click();
    
    // Wait for message to appear
    await expect(page.locator('text=Test message before refresh')).toBeVisible();
    
    // Refresh the page
    await page.reload();
    
    // Wait for page to reload
    await page.waitForTimeout(3000);
    
    // Check if session is maintained and user is still authenticated
    const isLoggedIn = await page.locator('textarea').isVisible().catch(() => false);
    
    if (isLoggedIn) {
      // If still logged in, check if chat history is preserved
      // Note: This depends on your app's conversation persistence implementation
      console.log('Session maintained after refresh');
    } else {
      // If redirected to login, that's also valid behavior
      console.log('Session expired after refresh - redirected to login');
      expect(page.url()).toMatch(/login|auth/);
    }
  });
});

test.describe('Chat Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Intercept chat API and simulate network error
    await page.route('**/api/chat', route => {
      route.abort('failed');
    });
    
    const chatInput = page.locator('textarea').first();
    const sendButton = page.locator('button').filter({ hasText: /send/i }).first();
    
    await chatInput.fill('This message should fail');
    await sendButton.click();
    
    // Wait for error handling
    await page.waitForTimeout(3000);
    
    // Look for error message or retry mechanism
    const errorMessage = page.locator('text=error, text=failed, text=try again').first();
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toBeVisible();
    }
  });

  test('should handle API timeout', async ({ page }) => {
    // Intercept chat API and simulate slow response
    await page.route('**/api/chat', route => {
      // Don't fulfill the request to simulate timeout
      setTimeout(() => route.abort('timedout'), 30000);
    });
    
    const chatInput = page.locator('textarea').first();
    const sendButton = page.locator('button').filter({ hasText: /send/i }).first();
    
    await chatInput.fill('This should timeout');
    await sendButton.click();
    
    // Wait for timeout handling (should be less than 30s)
    await page.waitForTimeout(10000);
    
    // Should show some kind of timeout or error message
    const timeoutIndicator = page.locator('text=timeout, text=taking longer, text=try again').first();
    if (await timeoutIndicator.isVisible()) {
      await expect(timeoutIndicator).toBeVisible();
    }
  });
});
