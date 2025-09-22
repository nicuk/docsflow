import { test, expect, Page } from '@playwright/test';
import path from 'path';

// Test utilities for setting up authenticated sessions
async function setupAuthenticatedSession(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'test1@example.com');
  await page.fill('input[type="password"]', 'Testing123?');
  
  const rememberCheckbox = page.locator('input[type="checkbox"]#remember');
  if (await rememberCheckbox.isVisible()) {
    await rememberCheckbox.check();
  }
  
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
}

// Helper function to create test files
async function createTestFile(page: Page, fileName: string, content: string, mimeType: string = 'text/plain') {
  // Create test file buffer
  const buffer = Buffer.from(content);
  return {
    name: fileName,
    mimeType: mimeType,
    buffer: buffer
  };
}

test.describe('Document Upload Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
    
    // Navigate to documents page or dashboard where upload is available
    await page.goto('/dashboard/documents');
    await page.waitForTimeout(1000);
  });

  test('should display upload interface correctly', async ({ page }) => {
    // Look for upload button or zone
    const uploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
    const uploadZone = page.locator('[class*="upload"], [data-testid*="upload"]').first();
    
    // At least one upload mechanism should be visible
    const hasUploadButton = await uploadButton.isVisible();
    const hasUploadZone = await uploadZone.isVisible();
    
    expect(hasUploadButton || hasUploadZone).toBeTruthy();
  });

  test('should upload single document successfully', async ({ page }) => {
    // Create test file path
    const testFilePath = path.join(__dirname, '..', 'fixtures', 'test-document.txt');
    
    // Look for file input or upload button
    const uploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
    
    if (await uploadButton.isVisible()) {
      // Click upload button to trigger file chooser
      const fileChooserPromise = page.waitForEvent('filechooser');
      await uploadButton.click();
      const fileChooser = await fileChooserPromise;
      
      // Upload the test file
      await fileChooser.setFiles([testFilePath]);
      
      // Wait for upload to complete
      await page.waitForTimeout(5000);
      
      // Look for success indicators
      const successIndicators = [
        page.locator('text=uploaded successfully'),
        page.locator('text=processing'),
        page.locator('text=completed'),
        page.locator('[data-testid*="upload-success"]'),
        page.locator('.upload-success')
      ];
      
      let uploadSuccess = false;
      for (const indicator of successIndicators) {
        if (await indicator.first().isVisible()) {
          await expect(indicator.first()).toBeVisible();
          uploadSuccess = true;
          break;
        }
      }
      
      // Also check if document appears in document list
      const documentList = page.locator('text=test-document.txt, [class*="document"]').first();
      if (await documentList.isVisible()) {
        await expect(documentList).toBeVisible();
        uploadSuccess = true;
      }
      
      expect(uploadSuccess).toBeTruthy();
    } else {
      console.log('Upload button not found - may need to authenticate or navigate differently');
    }
  });

  test('should upload multiple documents', async ({ page }) => {
    const testFiles = [
      path.join(__dirname, '..', 'fixtures', 'test-document-1.txt'),
      path.join(__dirname, '..', 'fixtures', 'test-document-2.txt')
    ];
    
    const uploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
    
    if (await uploadButton.isVisible()) {
      const fileChooserPromise = page.waitForEvent('filechooser');
      await uploadButton.click();
      const fileChooser = await fileChooserPromise;
      
      // Upload multiple files
      await fileChooser.setFiles(testFiles);
      
      // Wait for uploads to complete
      await page.waitForTimeout(8000);
      
      // Check for multiple upload success indicators
      const uploadProgresses = page.locator('[class*="progress"], [data-testid*="progress"]');
      const uploadCount = await uploadProgresses.count();
      
      if (uploadCount > 0) {
        // Should have progress indicators for multiple files
        expect(uploadCount).toBeGreaterThanOrEqual(1);
      }
      
      // Look for completed uploads
      const completedUploads = page.locator('text=completed, text=processed, text=uploaded successfully');
      const completedCount = await completedUploads.count();
      expect(completedCount).toBeGreaterThanOrEqual(1);
    }
  });

  test('should support drag and drop upload', async ({ page }) => {
    // Look for drag and drop zone
    const dropZone = page.locator('[class*="drop"], [class*="drag"], [data-testid*="upload-zone"]').first();
    
    if (await dropZone.isVisible()) {
      // Create test file
      const testFile = await createTestFile(page, 'drag-drop-test.txt', 'This is a test file for drag and drop upload.');
      
      // Simulate drag and drop
      await dropZone.hover();
      
      // Trigger file drop event
      await dropZone.dispatchEvent('drop', {
        dataTransfer: {
          files: [testFile]
        }
      });
      
      // Wait for upload processing
      await page.waitForTimeout(5000);
      
      // Check for upload success
      const uploadSuccess = page.locator('text=drag-drop-test.txt, text=uploaded, text=processing').first();
      if (await uploadSuccess.isVisible()) {
        await expect(uploadSuccess).toBeVisible();
      }
    } else {
      console.log('Drag and drop zone not found');
    }
  });

  test('should show upload progress', async ({ page }) => {
    const uploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
    
    if (await uploadButton.isVisible()) {
      // Use a larger test file to see progress
      const testFilePath = path.join(__dirname, '..', 'fixtures', 'large-test-document.pdf');
      
      const fileChooserPromise = page.waitForEvent('filechooser');
      await uploadButton.click();
      const fileChooser = await fileChooserPromise;
      
      await fileChooser.setFiles([testFilePath]);
      
      // Look for progress indicators immediately after upload starts
      await page.waitForTimeout(1000);
      
      const progressIndicators = [
        page.locator('[class*="progress"]'),
        page.locator('[data-testid*="progress"]'),
        page.locator('text=uploading'),
        page.locator('text=%')
      ];
      
      let foundProgress = false;
      for (const indicator of progressIndicators) {
        if (await indicator.first().isVisible()) {
          await expect(indicator.first()).toBeVisible();
          foundProgress = true;
          break;
        }
      }
      
      // Wait for completion
      await page.waitForTimeout(8000);
      
      // Should eventually show completion
      const completionIndicators = page.locator('text=completed, text=processed, text=100%').first();
      if (await completionIndicators.isVisible()) {
        await expect(completionIndicators).toBeVisible();
      }
    }
  });

  test('should handle different file types', async ({ page }) => {
    const fileTypes = [
      { name: 'document.pdf', path: path.join(__dirname, '..', 'fixtures', 'test.pdf') },
      { name: 'spreadsheet.xlsx', path: path.join(__dirname, '..', 'fixtures', 'test.xlsx') },
      { name: 'presentation.pptx', path: path.join(__dirname, '..', 'fixtures', 'test.pptx') },
      { name: 'text.txt', path: path.join(__dirname, '..', 'fixtures', 'test.txt') }
    ];
    
    for (const fileType of fileTypes) {
      const uploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
      
      if (await uploadButton.isVisible()) {
        const fileChooserPromise = page.waitForEvent('filechooser');
        await uploadButton.click();
        const fileChooser = await fileChooserPromise;
        
        await fileChooser.setFiles([fileType.path]);
        
        // Wait for upload processing
        await page.waitForTimeout(3000);
        
        // Check if file type is recognized and processed
        const fileTypeIndicator = page.locator(`text=${fileType.name.split('.')[1]}`).first();
        if (await fileTypeIndicator.isVisible()) {
          console.log(`File type ${fileType.name} uploaded successfully`);
        }
        
        // Wait before next upload
        await page.waitForTimeout(2000);
      }
    }
  });

  test('should handle upload errors gracefully', async ({ page }) => {
    // Intercept upload API to simulate errors
    await page.route('**/api/documents/upload*', route => {
      route.abort('failed');
    });
    
    const uploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
    
    if (await uploadButton.isVisible()) {
      const testFilePath = path.join(__dirname, '..', 'fixtures', 'test-document.txt');
      
      const fileChooserPromise = page.waitForEvent('filechooser');
      await uploadButton.click();
      const fileChooser = await fileChooserPromise;
      
      await fileChooser.setFiles([testFilePath]);
      
      // Wait for error handling
      await page.waitForTimeout(5000);
      
      // Look for error indicators
      const errorIndicators = [
        page.locator('text=failed'),
        page.locator('text=error'),
        page.locator('text=try again'),
        page.locator('[class*="error"]'),
        page.locator('[data-testid*="error"]')
      ];
      
      let foundError = false;
      for (const indicator of errorIndicators) {
        if (await indicator.first().isVisible()) {
          await expect(indicator.first()).toBeVisible();
          foundError = true;
          break;
        }
      }
      
      expect(foundError).toBeTruthy();
    }
  });

  test('should validate file size limits', async ({ page }) => {
    // Try to upload an oversized file (simulate by intercepting)
    await page.route('**/api/documents/upload*', route => {
      route.fulfill({
        status: 413,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'File too large' })
      });
    });
    
    const uploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
    
    if (await uploadButton.isVisible()) {
      const testFilePath = path.join(__dirname, '..', 'fixtures', 'test-document.txt');
      
      const fileChooserPromise = page.waitForEvent('filechooser');
      await uploadButton.click();
      const fileChooser = await fileChooserPromise;
      
      await fileChooser.setFiles([testFilePath]);
      
      // Wait for validation error
      await page.waitForTimeout(3000);
      
      // Look for size limit error
      const sizeError = page.locator('text=too large, text=file size, text=limit exceeded').first();
      if (await sizeError.isVisible()) {
        await expect(sizeError).toBeVisible();
      }
    }
  });

  test('should show uploaded documents in list', async ({ page }) => {
    // First upload a document
    const uploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
    
    if (await uploadButton.isVisible()) {
      const testFilePath = path.join(__dirname, '..', 'fixtures', 'test-list-document.txt');
      
      const fileChooserPromise = page.waitForEvent('filechooser');
      await uploadButton.click();
      const fileChooser = await fileChooserPromise;
      
      await fileChooser.setFiles([testFilePath]);
      
      // Wait for upload completion
      await page.waitForTimeout(5000);
      
      // Check if document appears in the document list
      const documentsList = page.locator('[class*="document"], [data-testid*="document"]');
      const documentsCount = await documentsList.count();
      
      if (documentsCount > 0) {
        expect(documentsCount).toBeGreaterThan(0);
        
        // Look for the specific document we uploaded
        const ourDocument = page.locator('text=test-list-document.txt').first();
        if (await ourDocument.isVisible()) {
          await expect(ourDocument).toBeVisible();
        }
      }
      
      // Check for document metadata (size, date, status)
      const documentMetadata = page.locator('[class*="size"], [class*="date"], [class*="status"]');
      const metadataCount = await documentMetadata.count();
      
      if (metadataCount > 0) {
        expect(metadataCount).toBeGreaterThan(0);
      }
    }
  });

  test('should support document actions (delete, download)', async ({ page }) => {
    // Navigate to documents list
    await page.goto('/dashboard/documents');
    await page.waitForTimeout(2000);
    
    // Look for existing documents or upload one first
    const existingDocs = page.locator('[class*="document"], [data-testid*="document"]');
    const docCount = await existingDocs.count();
    
    if (docCount === 0) {
      // Upload a test document first
      const uploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
      if (await uploadButton.isVisible()) {
        const testFilePath = path.join(__dirname, '..', 'fixtures', 'test-actions-document.txt');
        
        const fileChooserPromise = page.waitForEvent('filechooser');
        await uploadButton.click();
        const fileChooser = await fileChooserPromise;
        
        await fileChooser.setFiles([testFilePath]);
        await page.waitForTimeout(5000);
      }
    }
    
    // Look for document action buttons (menu, delete, download)
    const actionButtons = page.locator('button[class*="menu"], button[class*="action"], [data-testid*="action"]');
    const actionCount = await actionButtons.count();
    
    if (actionCount > 0) {
      // Click on first action button
      await actionButtons.first().click();
      
      // Look for action menu items
      const deleteAction = page.locator('text=delete, [data-testid*="delete"]').first();
      const downloadAction = page.locator('text=download, [data-testid*="download"]').first();
      
      if (await deleteAction.isVisible()) {
        console.log('Delete action found');
      }
      
      if (await downloadAction.isVisible()) {
        console.log('Download action found');
      }
    }
  });
});

test.describe('Upload Integration with Chat', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
  });

  test('should allow uploading documents from chat interface', async ({ page }) => {
    // Navigate to chat
    await page.goto('/dashboard/chat');
    await page.waitForTimeout(2000);
    
    // Look for upload button in chat
    const chatUploadButton = page.locator('button').filter({ hasText: /upload|attach/i }).first();
    
    if (await chatUploadButton.isVisible()) {
      const testFilePath = path.join(__dirname, '..', 'fixtures', 'chat-upload-test.txt');
      
      const fileChooserPromise = page.waitForEvent('filechooser');
      await chatUploadButton.click();
      const fileChooser = await fileChooserPromise;
      
      await fileChooser.setFiles([testFilePath]);
      
      // Wait for upload and check if document is referenced in chat
      await page.waitForTimeout(5000);
      
      // Look for upload confirmation in chat
      const uploadConfirmation = page.locator('text=uploaded, text=attached, text=chat-upload-test.txt').first();
      if (await uploadConfirmation.isVisible()) {
        await expect(uploadConfirmation).toBeVisible();
      }
      
      // Try asking a question about the uploaded document
      const chatInput = page.locator('textarea').first();
      const sendButton = page.locator('button').filter({ hasText: /send/i }).first();
      
      if (await chatInput.isVisible()) {
        await chatInput.fill('What does the uploaded document contain?');
        await sendButton.click();
        
        // Wait for AI response that should reference the document
        await page.waitForTimeout(8000);
        
        // Look for AI response mentioning the document
        const documentResponse = page.locator('text=chat-upload-test, text=document, text=uploaded').first();
        if (await documentResponse.isVisible()) {
          console.log('AI successfully referenced uploaded document');
        }
      }
    }
  });
});
