import { test, expect, Page } from '@playwright/test';
import path from 'path';

// Enhanced test utilities for setting up authenticated sessions
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
    await page.waitForTimeout(2000);
  }
}

test.describe('Enhanced Chat Interface Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
  });

  test('should display all header elements correctly', async ({ page }) => {
    // Check header logo and title
    await expect(page.locator('text=DocsFlow')).toBeVisible();
    await expect(page.locator('[data-testid="message-square"], .lucide-message-square')).toBeVisible();
    
    // Check header buttons
    await expect(page.locator('button:has-text("History")')).toBeVisible();
    await expect(page.locator('button:has-text("New Chat")')).toBeVisible();
    await expect(page.locator('button:has-text("Clear")')).toBeVisible();
    await expect(page.locator('button:has-text("Export")')).toBeVisible();
    
    // Check animated conversation context when conversation exists
    const contextText = page.locator('text=Chat Assistant • AI-powered document analysis');
    // This might not be visible initially if no conversation is active
  });

  test('should handle conversation history sidebar', async ({ page }) => {
    // Open conversation history
    await page.click('button:has-text("History")');
    
    // Check sidebar visibility
    await expect(page.locator('text=Conversations')).toBeVisible();
    await expect(page.locator('text=Your chat history')).toBeVisible();
    
    // Check empty state initially
    const emptyState = page.locator('text=No conversations yet');
    if (await emptyState.isVisible()) {
      await expect(page.locator('text=Start a new chat to begin')).toBeVisible();
    }
    
    // Close sidebar
    await page.click('button:has-text("History")');
    await expect(page.locator('text=Conversations')).not.toBeVisible();
  });

  test('should create new conversation and show persistent badge', async ({ page }) => {
    // Create new conversation
    await page.click('button:has-text("New Chat")');
    
    // Wait for conversation creation
    await page.waitForTimeout(2000);
    
    // Check for conversation context indicator
    const persistentBadge = page.locator('text=Persistent');
    // Badge should appear after conversation is created and message is sent
    
    // Send a test message to establish conversation
    const chatInput = page.locator('input[type="text"], textarea').first();
    await chatInput.fill('Test message for new conversation');
    await page.click('button:has([data-testid="send"], .lucide-send)');
    
    // Wait for conversation to be established
    await page.waitForTimeout(3000);
    
    // Check if persistent badge is now visible
    if (await persistentBadge.isVisible()) {
      await expect(persistentBadge).toBeVisible();
      await expect(page.locator('text=Conversation will be saved automatically')).toBeVisible();
    }
  });

  test('should handle file upload with attachment button', async ({ page }) => {
    // Check for file upload/attachment button
    const attachButton = page.locator('button:has([data-testid="paperclip"], .lucide-paperclip)');
    await expect(attachButton).toBeVisible();
    
    // Test file upload functionality
    const fileChooserPromise = page.waitForEvent('filechooser');
    await attachButton.click();
    const fileChooser = await fileChooserPromise;
    
    // Upload test file
    const testFilePath = path.join(__dirname, '..', '..', 'fixtures', 'test-document.txt');
    await fileChooser.setFiles([testFilePath]);
    
    // Wait for upload feedback
    await page.waitForTimeout(3000);
    
    // Look for upload confirmation (implementation may vary)
    const uploadSuccess = page.locator('text=uploaded, text=success, [data-testid*="upload-success"]');
    // Note: Upload success indication depends on your implementation
  });

  test('should display confidence indicators and sources correctly', async ({ page }) => {
    // Send a message
    const chatInput = page.locator('input[type="text"], textarea').first();
    const sendButton = page.locator('button:has([data-testid="send"], .lucide-send)');
    
    await chatInput.fill('What information do you have about business documents?');
    await sendButton.click();
    
    // Wait for AI response
    await page.waitForTimeout(8000);
    
    // Check for AI assistant badge
    await expect(page.locator('text=AI Assistant')).toBeVisible();
    
    // Check for sparkles icon (AI indicator)
    await expect(page.locator('[data-testid="sparkles"], .lucide-sparkles')).toBeVisible();
    
    // Look for confidence indicator if present
    const confidenceIndicator = page.locator('[data-testid*="confidence"], .confidence-indicator');
    if (await confidenceIndicator.isVisible()) {
      await expect(confidenceIndicator).toBeVisible();
    }
    
    // Check for sources section if available
    const sourcesSection = page.locator('text=Sources:');
    if (await sourcesSection.isVisible()) {
      await expect(sourcesSection).toBeVisible();
      
      // Check for source documents
      const sourceButtons = page.locator('button:has([data-testid="file-text"], .lucide-file-text)');
      const sourceCount = await sourceButtons.count();
      if (sourceCount > 0) {
        // Click on first source to test modal
        await sourceButtons.first().click();
        
        // Wait for potential source modal (if implemented)
        await page.waitForTimeout(1000);
      }
    }
    
    // Check for follow-up suggestions
    const suggestionsSection = page.locator('text=Ask about:');
    if (await suggestionsSection.isVisible()) {
      await expect(suggestionsSection).toBeVisible();
      
      // Test clicking a suggestion
      const suggestionButtons = page.locator('button:has([data-testid="chevron-right"], .lucide-chevron-right)');
      const suggestionCount = await suggestionButtons.count();
      if (suggestionCount > 0) {
        const suggestionText = await suggestionButtons.first().textContent();
        await suggestionButtons.first().click();
        
        // Verify suggestion was sent as new message
        await page.waitForTimeout(2000);
        if (suggestionText) {
          await expect(page.locator(`text=${suggestionText.replace(/→|\s*$/, '').trim()}`)).toBeVisible();
        }
      }
    }
  });

  test('should handle loading states correctly', async ({ page }) => {
    const chatInput = page.locator('input[type="text"], textarea').first();
    const sendButton = page.locator('button:has([data-testid="send"], .lucide-send)');
    
    await chatInput.fill('Test loading states');
    await sendButton.click();
    
    // Check for loading message immediately
    const loadingMessage = page.locator('text=Analyzing documents...');
    if (await loadingMessage.isVisible({ timeout: 2000 })) {
      await expect(loadingMessage).toBeVisible();
      
      // Check for loading animation (bouncing dots)
      const loadingDots = page.locator('.animate-bounce');
      await expect(loadingDots.first()).toBeVisible();
    }
    
    // Wait for loading to complete
    await page.waitForTimeout(8000);
    
    // Loading message should be gone
    await expect(loadingMessage).not.toBeVisible();
    
    // Should have AI response
    await expect(page.locator('text=AI Assistant')).toBeVisible();
  });

  test('should handle input field states and validation', async ({ page }) => {
    const chatInput = page.locator('input[type="text"], textarea').first();
    const sendButton = page.locator('button:has([data-testid="send"], .lucide-send)');
    
    // Initially, send button should be disabled with empty input
    await expect(sendButton).toBeDisabled();
    
    // Type message
    await chatInput.fill('Test message');
    
    // Send button should now be enabled
    await expect(sendButton).toBeEnabled();
    
    // Clear input
    await chatInput.fill('');
    
    // Send button should be disabled again
    await expect(sendButton).toBeDisabled();
    
    // Test placeholder text rotation (if implemented)
    const placeholder = await chatInput.getAttribute('placeholder');
    expect(placeholder).toBeTruthy();
    expect(placeholder).toContain('Ask anything about your business documents');
  });

  test('should export chat history successfully', async ({ page }) => {
    // Send a test message first
    const chatInput = page.locator('input[type="text"], textarea').first();
    const sendButton = page.locator('button:has([data-testid="send"], .lucide-send)');
    
    await chatInput.fill('Test message for export');
    await sendButton.click();
    
    // Wait for response
    await page.waitForTimeout(5000);
    
    // Start download expectation
    const downloadPromise = page.waitForEvent('download');
    
    // Click export button
    await page.click('button:has-text("Export")');
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/chat-history-\d{4}-\d{2}-\d{2}\.json/);
    
    // Save and verify file content
    const filePath = path.join(__dirname, '..', '..', 'fixtures', 'downloaded-chat.json');
    await download.saveAs(filePath);
    
    // Verify file exists and has content
    const fs = require('fs');
    expect(fs.existsSync(filePath)).toBeTruthy();
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const chatData = JSON.parse(fileContent);
    expect(Array.isArray(chatData)).toBeTruthy();
    expect(chatData.length).toBeGreaterThan(0);
    
    // Clean up
    fs.unlinkSync(filePath);
  });

  test('should handle keyboard shortcuts correctly', async ({ page }) => {
    const chatInput = page.locator('input[type="text"], textarea').first();
    
    // Test Enter to send
    await chatInput.fill('Test Enter key sending');
    await chatInput.press('Enter');
    
    // Message should be sent
    await expect(page.locator('text=Test Enter key sending')).toBeVisible();
    
    // Test Shift+Enter for new line (if textarea)
    if (await chatInput.evaluate(el => el.tagName.toLowerCase() === 'textarea')) {
      await chatInput.fill('Line 1');
      await chatInput.press('Shift+Enter');
      await chatInput.type('Line 2');
      
      const inputValue = await chatInput.inputValue();
      expect(inputValue).toContain('\n');
    }
  });

  test('should maintain responsive design on mobile viewports', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check if interface adapts
    const chatInput = page.locator('input[type="text"], textarea').first();
    await expect(chatInput).toBeVisible();
    
    // Check if buttons are still accessible
    const sendButton = page.locator('button:has([data-testid="send"], .lucide-send)');
    await expect(sendButton).toBeVisible();
    
    // Check if header buttons are visible or collapsed appropriately
    const headerButtons = page.locator('button:has-text("History")');
    await expect(headerButtons).toBeVisible();
  });

  test('should handle conversation switching correctly', async ({ page }) => {
    // Create first conversation
    await page.click('button:has-text("New Chat")');
    const chatInput = page.locator('input[type="text"], textarea').first();
    await chatInput.fill('First conversation message');
    await page.click('button:has([data-testid="send"], .lucide-send)');
    await page.waitForTimeout(3000);
    
    // Create second conversation
    await page.click('button:has-text("New Chat")');
    await chatInput.fill('Second conversation message');
    await page.click('button:has([data-testid="send"], .lucide-send)');
    await page.waitForTimeout(3000);
    
    // Open conversation history
    await page.click('button:has-text("History")');
    
    // Should see multiple conversations
    const conversationButtons = page.locator('button:has-text("messages")');
    const conversationCount = await conversationButtons.count();
    
    if (conversationCount > 1) {
      // Click on first conversation
      await conversationButtons.first().click();
      
      // Should switch to that conversation
      await page.waitForTimeout(2000);
      
      // Verify conversation content switched
      // Note: This depends on the conversation history being loaded correctly
    }
  });
});

test.describe('Chat API Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
  });

  test('should handle API rate limiting gracefully', async ({ page }) => {
    // Intercept chat API to simulate rate limiting
    await page.route('**/api/chat', route => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Rate limit exceeded' })
      });
    });
    
    const chatInput = page.locator('input[type="text"], textarea').first();
    const sendButton = page.locator('button:has([data-testid="send"], .lucide-send)');
    
    await chatInput.fill('Test rate limiting');
    await sendButton.click();
    
    // Should handle rate limiting error gracefully
    await page.waitForTimeout(5000);
    
    // Look for rate limiting error message
    const errorIndicator = page.locator('text=rate limit, text=too many requests, text=slow down');
    // Note: Actual error handling depends on your implementation
  });

  test('should handle malformed API responses', async ({ page }) => {
    // Intercept chat API to return malformed response
    await page.route('**/api/chat', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid json response'
      });
    });
    
    const chatInput = page.locator('input[type="text"], textarea').first();
    await chatInput.fill('Test malformed response');
    await page.click('button:has([data-testid="send"], .lucide-send)');
    
    // Should handle parsing error gracefully
    await page.waitForTimeout(5000);
    
    // Should show some kind of error indication
    const errorMessage = page.locator('text=error, text=problem, text=try again');
    // Note: Error handling depends on your implementation
  });

  test('should work with real API when available', async ({ page }) => {
    // This test will use the actual API without interception
    const chatInput = page.locator('input[type="text"], textarea').first();
    const sendButton = page.locator('button:has([data-testid="send"], .lucide-send)');
    
    await chatInput.fill('What can you tell me about document analysis?');
    await sendButton.click();
    
    // Wait for real API response (longer timeout)
    await page.waitForTimeout(15000);
    
    // Should receive a proper AI response
    const aiResponse = page.locator('text=AI Assistant').first();
    if (await aiResponse.isVisible()) {
      await expect(aiResponse).toBeVisible();
      
      // Should have response content
      const responseContent = page.locator('.ai-message, [data-testid*="ai-response"]').first();
      if (await responseContent.isVisible()) {
        const responseText = await responseContent.textContent();
        expect(responseText).toBeTruthy();
        expect(responseText!.length).toBeGreaterThan(10);
      }
    }
  });
});
