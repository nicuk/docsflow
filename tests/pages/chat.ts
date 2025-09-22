import { Page, Locator, expect } from '@playwright/test';

export class ChatPage {
  readonly page: Page;
  readonly chatInput: Locator;
  readonly sendButton: Locator;
  readonly messageHistory: Locator;
  readonly fileUpload: Locator;
  readonly attachmentButton: Locator;
  readonly confidenceIndicator: Locator;
  readonly conversationHistoryButton: Locator;
  readonly newChatButton: Locator;
  readonly clearButton: Locator;
  readonly exportButton: Locator;
  readonly welcomeMessage: Locator;
  readonly aiAssistantBadge: Locator;
  readonly loadingIndicator: Locator;
  readonly sourcesSection: Locator;
  readonly suggestionsSection: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Input and send controls
    this.chatInput = page.locator('input[type="text"], textarea').first();
    this.sendButton = page.locator('button:has([data-testid="send"], .lucide-send)');
    this.attachmentButton = page.locator('button:has([data-testid="paperclip"], .lucide-paperclip)');
    
    // Message containers
    this.messageHistory = page.locator('.message, .chat-message, [data-testid*="message"]');
    this.welcomeMessage = page.locator('text=Hello! I\'m your business docsflow.app assistant');
    this.aiAssistantBadge = page.locator('text=AI Assistant');
    this.loadingIndicator = page.locator('text=Analyzing documents...');
    
    // Content sections
    this.sourcesSection = page.locator('text=Sources:');
    this.suggestionsSection = page.locator('text=Ask about:');
    this.confidenceIndicator = page.locator('.confidence, [data-testid*="confidence"], .confidence-indicator');
    
    // Header controls
    this.conversationHistoryButton = page.locator('button:has-text("History")');
    this.newChatButton = page.locator('button:has-text("New Chat")');
    this.clearButton = page.locator('button:has-text("Clear")');
    this.exportButton = page.locator('button:has-text("Export")');
    
    // File upload (hidden input)
    this.fileUpload = page.locator('input[type="file"]').first();
  }

  async goto() {
    await this.page.goto('/dashboard/chat');
  }

  async sendMessage(message: string) {
    await this.chatInput.fill(message);
    await this.sendButton.click();
    
    // Wait for response
    await this.page.waitForTimeout(2000);
  }

  async sendMessageAndWaitForResponse(message: string, timeout: number = 10000) {
    await this.chatInput.fill(message);
    await this.sendButton.click();
    
    // Wait for loading to appear and disappear
    await this.waitForLoadingToComplete(timeout);
  }

  async uploadFileViaButton(filePath: string) {
    const fileChooserPromise = this.page.waitForEvent('filechooser');
    await this.attachmentButton.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([filePath]);
    
    // Wait for upload to complete
    await this.page.waitForTimeout(3000);
  }

  async uploadFile(filePath: string) {
    await this.fileUpload.setInputFiles(filePath);
    
    // Wait for upload to complete
    await this.page.waitForTimeout(3000);
  }

  async getLastMessage() {
    return await this.messageHistory.last().textContent();
  }

  async waitForResponse() {
    // Wait for AI response to appear
    await this.page.waitForSelector('.ai-response, .bot-message, [data-testid*="ai-response"]', {
      timeout: 10000
    });
  }

  async waitForLoadingToComplete(timeout: number = 10000) {
    // Wait for loading indicator to appear
    try {
      await this.loadingIndicator.waitFor({ state: 'visible', timeout: 2000 });
      // Then wait for it to disappear
      await this.loadingIndicator.waitFor({ state: 'hidden', timeout: timeout });
    } catch (error) {
      // Loading might have completed too quickly to catch
      console.log('Loading completed too quickly or not visible');
    }
  }

  async checkConfidenceLevel() {
    if (await this.confidenceIndicator.isVisible()) {
      return await this.confidenceIndicator.getAttribute('data-confidence') || 
             await this.confidenceIndicator.textContent();
    }
    return null;
  }

  async openConversationHistory() {
    await this.conversationHistoryButton.click();
    await this.page.waitForTimeout(500);
  }

  async closeConversationHistory() {
    await this.conversationHistoryButton.click();
    await this.page.waitForTimeout(500);
  }

  async createNewConversation() {
    await this.newChatButton.click();
    await this.page.waitForTimeout(1000);
  }

  async clearConversation() {
    await this.clearButton.click();
    await this.page.waitForTimeout(500);
  }

  async exportChat() {
    const downloadPromise = this.page.waitForEvent('download');
    await this.exportButton.click();
    return await downloadPromise;
  }

  async clickSuggestion(suggestionText: string) {
    const suggestionButton = this.page.locator(`button:has-text("${suggestionText}")`);
    await suggestionButton.click();
    await this.page.waitForTimeout(2000);
  }

  async clickSource(sourceIndex: number = 0) {
    const sourceButtons = this.page.locator('button:has([data-testid="file-text"], .lucide-file-text)');
    if (await sourceButtons.count() > sourceIndex) {
      await sourceButtons.nth(sourceIndex).click();
      await this.page.waitForTimeout(1000);
    }
  }

  async verifyWelcomeMessage() {
    await expect(this.welcomeMessage).toBeVisible();
  }

  async verifyAIResponse() {
    await expect(this.aiAssistantBadge).toBeVisible();
  }

  async verifySendButtonState(shouldBeEnabled: boolean) {
    if (shouldBeEnabled) {
      await expect(this.sendButton).toBeEnabled();
    } else {
      await expect(this.sendButton).toBeDisabled();
    }
  }

  async getMessageCount() {
    return await this.messageHistory.count();
  }

  async getConversationCount() {
    await this.openConversationHistory();
    const conversations = this.page.locator('button:has-text("messages")');
    const count = await conversations.count();
    await this.closeConversationHistory();
    return count;
  }

  async switchToConversation(conversationIndex: number) {
    await this.openConversationHistory();
    const conversations = this.page.locator('button:has-text("messages")');
    if (await conversations.count() > conversationIndex) {
      await conversations.nth(conversationIndex).click();
      await this.page.waitForTimeout(1000);
    }
  }

  async verifyInputPlaceholder() {
    const placeholder = await this.chatInput.getAttribute('placeholder');
    expect(placeholder).toBeTruthy();
    expect(placeholder).toContain('Ask anything about your business documents');
  }

  async testKeyboardShortcuts() {
    // Test Enter to send
    await this.chatInput.fill('Test Enter key');
    await this.chatInput.press('Enter');
    
    // Wait for message to appear
    await this.page.waitForTimeout(1000);
    return await this.page.locator('text=Test Enter key').isVisible();
  }

  async testMultilineInput() {
    // Only applicable if using textarea
    const tagName = await this.chatInput.evaluate(el => el.tagName.toLowerCase());
    if (tagName === 'textarea') {
      await this.chatInput.fill('Line 1');
      await this.chatInput.press('Shift+Enter');
      await this.chatInput.type('Line 2');
      
      const inputValue = await this.chatInput.inputValue();
      return inputValue.includes('\n');
    }
    return false;
  }
}
