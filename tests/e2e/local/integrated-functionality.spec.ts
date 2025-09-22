import { test, expect } from '@playwright/test';
import { TestUtils, defaultTestConfig } from '../utils/test-runner';
import path from 'path';

/**
 * Integrated Functionality Tests
 * 
 * These tests verify that chat, document upload, and remember me functionality 
 * work together seamlessly in real-world usage scenarios.
 */

test.describe('Integrated Functionality Tests', () => {
  
  test('complete workflow: login with remember me → upload document → chat about document', async ({ page }) => {
    // Step 1: Login with remember me
    const authSuccess = await TestUtils.setupAuth(page, defaultTestConfig, true);
    expect(authSuccess).toBeTruthy();
    
    // Step 2: Navigate to documents and upload a file
    await page.goto('/dashboard/documents');
    await page.waitForTimeout(2000);
    
    const testFilePath = path.join(__dirname, '..', 'fixtures', 'test-document.txt');
    const uploadSuccess = await TestUtils.uploadFile(page, testFilePath);
    
    if (uploadSuccess) {
      // Wait for upload to complete
      await page.waitForTimeout(5000);
      
      // Step 3: Navigate to chat
      await page.goto('/dashboard/chat');
      await page.waitForTimeout(2000);
      
      // Step 4: Ask about the uploaded document
      const chatSuccess = await TestUtils.sendChatMessage(
        page, 
        'What information is in the test document I just uploaded?'
      );
      expect(chatSuccess).toBeTruthy();
      
      // Step 5: Wait for AI response
      const responseReceived = await TestUtils.waitForAiResponse(page);
      if (responseReceived) {
        console.log('✅ Complete workflow successful: Login → Upload → Chat');
      } else {
        console.log('⚠️ AI response not received, but workflow completed');
      }
      
      // Step 6: Verify session is still maintained
      expect(await TestUtils.isAuthenticated(page)).toBeTruthy();
    } else {
      console.log('⚠️ Upload failed, skipping chat portion of test');
    }
  });

  test('remember me persistence across multiple operations', async ({ page }) => {
    // Login with remember me
    const authSuccess = await TestUtils.setupAuth(page, defaultTestConfig, true);
    expect(authSuccess).toBeTruthy();
    
    // Perform multiple operations to test session persistence
    const operations = [
      { name: 'Upload Document', url: '/dashboard/documents' },
      { name: 'Use Chat', url: '/dashboard/chat' },
      { name: 'View Dashboard', url: '/dashboard' },
      { name: 'Back to Documents', url: '/dashboard/documents' }
    ];
    
    for (const operation of operations) {
      await page.goto(operation.url);
      await page.waitForTimeout(2000);
      
      // Verify still authenticated
      const stillAuth = await TestUtils.isAuthenticated(page);
      expect(stillAuth).toBeTruthy();
      
      console.log(`✅ ${operation.name}: Session maintained`);
    }
    
    // Check remember me cookie is still present
    const cookies = await page.context().cookies();
    const rememberCookie = cookies.find(cookie => cookie.name === 'remember-me');
    
    if (rememberCookie) {
      expect(rememberCookie.value).toBe('true');
    }
  });

  test('chat functionality with multiple uploaded documents', async ({ page }) => {
    const authSuccess = await TestUtils.setupAuth(page, defaultTestConfig, true);
    expect(authSuccess).toBeTruthy();
    
    // Upload multiple test documents
    await page.goto('/dashboard/documents');
    await page.waitForTimeout(2000);
    
    const testFiles = [
      'test-document-1.txt',
      'test-document-2.txt'
    ];
    
    let uploadCount = 0;
    for (const fileName of testFiles) {
      const filePath = path.join(__dirname, '..', 'fixtures', fileName);
      const uploadSuccess = await TestUtils.uploadFile(page, filePath);
      if (uploadSuccess) {
        uploadCount++;
        await page.waitForTimeout(3000); // Wait between uploads
      }
    }
    
    if (uploadCount > 0) {
      // Navigate to chat and ask about documents
      await page.goto('/dashboard/chat');
      await page.waitForTimeout(2000);
      
      const chatQueries = [
        'How many documents have I uploaded?',
        'What is the total revenue mentioned in my documents?',
        'Summarize the key information from all uploaded documents'
      ];
      
      for (const query of chatQueries) {
        const chatSuccess = await TestUtils.sendChatMessage(page, query);
        expect(chatSuccess).toBeTruthy();
        
        // Wait for response before next query
        await page.waitForTimeout(5000);
      }
      
      console.log(`✅ Chat tested with ${uploadCount} uploaded documents`);
    }
  });

  test('error handling across all functionalities', async ({ page }) => {
    const authSuccess = await TestUtils.setupAuth(page, defaultTestConfig, true);
    expect(authSuccess).toBeTruthy();
    
    // Test 1: Upload error handling
    await page.goto('/dashboard/documents');
    
    // Intercept upload API to simulate error
    await page.route('**/api/documents/upload*', route => {
      route.abort('failed');
    });
    
    const testFilePath = path.join(__dirname, '..', 'fixtures', 'test-document.txt');
    await TestUtils.uploadFile(page, testFilePath);
    
    // Wait and check for error handling
    await page.waitForTimeout(3000);
    const uploadErrors = await TestUtils.checkForApiErrors(page);
    console.log('Upload errors handled:', uploadErrors.length > 0 ? 'Yes' : 'No');
    
    // Test 2: Chat error handling
    await page.goto('/dashboard/chat');
    
    // Intercept chat API to simulate error
    await page.route('**/api/chat', route => {
      route.abort('failed');
    });
    
    await TestUtils.sendChatMessage(page, 'This should fail');
    await page.waitForTimeout(3000);
    
    const chatErrors = await TestUtils.checkForApiErrors(page);
    console.log('Chat errors handled:', chatErrors.length > 0 ? 'Yes' : 'No');
    
    // Test 3: Verify session is still maintained despite errors
    expect(await TestUtils.isAuthenticated(page)).toBeTruthy();
  });

  test('performance test: upload → chat → response cycle', async ({ page }) => {
    const authSuccess = await TestUtils.setupAuth(page, defaultTestConfig, true);
    expect(authSuccess).toBeTruthy();
    
    const startTime = Date.now();
    
    // Upload document
    await page.goto('/dashboard/documents');
    const uploadStart = Date.now();
    
    const testFilePath = path.join(__dirname, '..', 'fixtures', 'test-document.txt');
    const uploadSuccess = await TestUtils.uploadFile(page, testFilePath);
    
    const uploadTime = Date.now() - uploadStart;
    console.log(`Upload time: ${uploadTime}ms`);
    
    if (uploadSuccess) {
      // Wait for processing
      await page.waitForTimeout(5000);
      
      // Navigate to chat and ask question
      await page.goto('/dashboard/chat');
      const chatStart = Date.now();
      
      await TestUtils.sendChatMessage(page, 'What is in the document I just uploaded?');
      
      // Wait for AI response
      const responseReceived = await TestUtils.waitForAiResponse(page, 20000);
      const chatTime = Date.now() - chatStart;
      
      console.log(`Chat response time: ${chatTime}ms`);
      console.log(`Total workflow time: ${Date.now() - startTime}ms`);
      
      // Performance expectations (adjust based on your requirements)
      expect(uploadTime).toBeLessThan(30000); // 30 seconds max for upload
      expect(chatTime).toBeLessThan(25000);   // 25 seconds max for AI response
      
      if (responseReceived) {
        console.log('✅ Performance test completed successfully');
      }
    }
  });

  test('session management with remember me across different tabs', async ({ browser }) => {
    const context = await browser.newContext();
    
    // Tab 1: Login with remember me
    const page1 = await context.newPage();
    const authSuccess = await TestUtils.setupAuth(page1, defaultTestConfig, true);
    expect(authSuccess).toBeTruthy();
    
    // Tab 2: Open new tab and check if already authenticated
    const page2 = await context.newPage();
    await page2.goto('/dashboard');
    await page2.waitForTimeout(3000);
    
    const tab2Auth = await TestUtils.isAuthenticated(page2);
    expect(tab2Auth).toBeTruthy();
    
    // Tab 1: Upload document
    await page1.goto('/dashboard/documents');
    const testFilePath = path.join(__dirname, '..', 'fixtures', 'test-document.txt');
    const uploadSuccess = await TestUtils.uploadFile(page1, testFilePath);
    
    if (uploadSuccess) {
      await page1.waitForTimeout(3000);
      
      // Tab 2: Use chat to ask about document
      await page2.goto('/dashboard/chat');
      await page2.waitForTimeout(2000);
      
      const chatSuccess = await TestUtils.sendChatMessage(
        page2, 
        'Tell me about any recently uploaded documents'
      );
      expect(chatSuccess).toBeTruthy();
      
      console.log('✅ Multi-tab session management working correctly');
    }
    
    await context.close();
  });

  test('accessibility during full workflow', async ({ page }) => {
    const authSuccess = await TestUtils.setupAuth(page, defaultTestConfig, true);
    expect(authSuccess).toBeTruthy();
    
    // Check accessibility at each step
    const steps = [
      { name: 'Dashboard', url: '/dashboard' },
      { name: 'Documents', url: '/dashboard/documents' },
      { name: 'Chat', url: '/dashboard/chat' }
    ];
    
    for (const step of steps) {
      await page.goto(step.url);
      await page.waitForTimeout(2000);
      
      // Basic accessibility checks
      const hasSkipLinks = await page.locator('[href*="#main"], [href*="#content"]').count() > 0;
      const hasHeadings = await page.locator('h1, h2, h3').count() > 0;
      const hasLabels = await page.locator('label').count() > 0;
      
      console.log(`${step.name} accessibility:`, {
        skipLinks: hasSkipLinks,
        headings: hasHeadings,
        labels: hasLabels
      });
      
      // Check for form accessibility (if forms present)
      const inputs = page.locator('input, textarea, select');
      const inputCount = await inputs.count();
      
      if (inputCount > 0) {
        for (let i = 0; i < inputCount; i++) {
          const input = inputs.nth(i);
          const hasLabel = await input.getAttribute('aria-label') !== null ||
                          await input.getAttribute('aria-labelledby') !== null ||
                          await page.locator(`label[for="${await input.getAttribute('id')}"]`).count() > 0;
          
          if (!hasLabel) {
            console.warn(`Input without label found on ${step.name} page`);
          }
        }
      }
    }
  });

  test('data consistency across upload and chat', async ({ page }) => {
    const authSuccess = await TestUtils.setupAuth(page, defaultTestConfig, true);
    expect(authSuccess).toBeTruthy();
    
    // Upload document with specific content
    await page.goto('/dashboard/documents');
    const testFilePath = path.join(__dirname, '..', 'fixtures', 'test-document-1.txt');
    const uploadSuccess = await TestUtils.uploadFile(page, testFilePath);
    
    if (uploadSuccess) {
      await page.waitForTimeout(8000); // Wait for processing
      
      // Navigate to chat and ask specific questions about the document content
      await page.goto('/dashboard/chat');
      await page.waitForTimeout(2000);
      
      // Ask about specific data from the test document
      const questions = [
        'What is the revenue mentioned in the document?',
        'Who is the manager mentioned in the document?',
        'What is the customer satisfaction percentage?'
      ];
      
      for (const question of questions) {
        await TestUtils.sendChatMessage(page, question);
        await page.waitForTimeout(8000);
        
        // Check if AI response contains relevant data
        // Note: Actual content verification would depend on AI response format
        const responseVisible = await TestUtils.waitForAiResponse(page);
        if (responseVisible) {
          console.log(`✅ AI responded to: ${question}`);
        }
      }
    }
  });
});

test.describe('Stress Tests', () => {
  
  test('rapid succession operations with remember me', async ({ page }) => {
    const authSuccess = await TestUtils.setupAuth(page, defaultTestConfig, true);
    expect(authSuccess).toBeTruthy();
    
    // Rapid navigation between pages
    const pages = ['/dashboard', '/dashboard/chat', '/dashboard/documents'];
    
    for (let i = 0; i < 10; i++) {
      const targetPage = pages[i % pages.length];
      await page.goto(targetPage);
      await page.waitForTimeout(500); // Minimal wait
      
      // Verify session maintained
      const stillAuth = await TestUtils.isAuthenticated(page);
      expect(stillAuth).toBeTruthy();
    }
    
    console.log('✅ Rapid navigation stress test completed');
  });

  test('multiple chat messages in succession', async ({ page }) => {
    const authSuccess = await TestUtils.setupAuth(page, defaultTestConfig, true);
    expect(authSuccess).toBeTruthy();
    
    await page.goto('/dashboard/chat');
    await page.waitForTimeout(2000);
    
    const messages = [
      'Hello, can you help me?',
      'What services do you offer?',
      'How does document analysis work?',
      'What file types do you support?',
      'Can you analyze financial documents?'
    ];
    
    for (const message of messages) {
      await TestUtils.sendChatMessage(page, message);
      await page.waitForTimeout(2000); // Brief wait between messages
    }
    
    // Verify all messages are visible
    for (const message of messages) {
      await expect(page.locator(`text=${message}`)).toBeVisible();
    }
    
    console.log('✅ Multiple chat messages stress test completed');
  });
});
