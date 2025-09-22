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

// Helper to wait for upload completion
async function waitForUploadCompletion(page: Page, filename: string, maxWaitTime = 30000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    // Check for completion indicators
    const completedIndicators = await page.locator('text=completed, text=ready, text=100%, text=✓ Complete').count();
    const errorIndicators = await page.locator('text=error, text=failed, text=✗ Failed').count();
    const processingIndicators = await page.locator('text=processing, text=uploading').count();
    
    if (errorIndicators > 0) {
      console.log(`❌ ${filename} upload failed`);
      return { status: 'error' };
    }
    
    if (completedIndicators > 0 && processingIndicators === 0) {
      console.log(`✅ ${filename} upload completed`);
      return { status: 'completed' };
    }
    
    await page.waitForTimeout(2000);
  }
  
  console.log(`⏰ ${filename} upload timeout`);
  return { status: 'timeout' };
}

test.describe('File Format Upload Testing', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
    await page.goto('/dashboard/documents');
    await page.waitForTimeout(2000);
  });

  test('should upload and process PDF documents', async ({ page }) => {
    console.log('📄 Testing PDF document upload...');
    
    // Create a simple PDF-like content (mock PDF for testing)
    const pdfMockContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 56
>>
stream
BT
/F1 12 Tf
100 700 Td
(PDF Test Document - RAG Integration) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000207 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
310
%%EOF`;
    
    const uploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
    expect(await uploadButton.isVisible()).toBeTruthy();
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await uploadButton.click();
    const fileChooser = await fileChooserPromise;
    
    await fileChooser.setFiles([{
      name: 'test-document.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(pdfMockContent)
    }]);
    
    const result = await waitForUploadCompletion(page, 'test-document.pdf');
    expect(result.status).toBe('completed');
    
    // Verify document appears in list
    const pdfDocument = page.locator('text=test-document.pdf').first();
    await expect(pdfDocument).toBeVisible({ timeout: 10000 });
    
    console.log('✅ PDF upload successful');
  });

  test('should upload and process Word documents', async ({ page }) => {
    console.log('📝 Testing Word document upload...');
    
    // Create a mock DOCX content (simplified structure)
    const docxContent = `PK
[Content_Types].xml
word/document.xml
word/_rels/document.xml.rels

Word Document Test Content:

This is a test Microsoft Word document for RAG integration testing.

Document contains:
- Headers and paragraphs
- Structured content
- Business information

Company: TestCorp
Location: Test City
Industry: Software Testing

This document should be processed by the RAG system and made searchable through AI chat.`;
    
    const uploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await uploadButton.click();
    const fileChooser = await fileChooserPromise;
    
    await fileChooser.setFiles([{
      name: 'test-document.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: Buffer.from(docxContent)
    }]);
    
    const result = await waitForUploadCompletion(page, 'test-document.docx');
    expect(result.status).toBe('completed');
    
    // Verify document appears in list
    const docxDocument = page.locator('text=test-document.docx').first();
    await expect(docxDocument).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Word document upload successful');
  });

  test('should upload and process Excel spreadsheets', async ({ page }) => {
    console.log('📊 Testing Excel spreadsheet upload...');
    
    // Create mock Excel content (CSV-like for testing)
    const excelContent = `Name,Position,Department,Salary,Start Date
John Smith,Software Engineer,Engineering,75000,2023-01-15
Jane Doe,Product Manager,Product,85000,2022-11-30
Mike Johnson,Data Analyst,Analytics,65000,2023-03-10
Sarah Wilson,UX Designer,Design,70000,2022-09-20
David Brown,DevOps Engineer,Engineering,80000,2023-02-01

Summary:
Total Employees: 5
Average Salary: $75,000
Departments: Engineering, Product, Analytics, Design

This spreadsheet contains employee data for RAG system testing.`;
    
    const uploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await uploadButton.click();
    const fileChooser = await fileChooserPromise;
    
    await fileChooser.setFiles([{
      name: 'employee-data.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from(excelContent)
    }]);
    
    const result = await waitForUploadCompletion(page, 'employee-data.xlsx');
    expect(result.status).toBe('completed');
    
    // Verify document appears in list
    const excelDocument = page.locator('text=employee-data.xlsx').first();
    await expect(excelDocument).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Excel spreadsheet upload successful');
  });

  test('should upload and process CSV files', async ({ page }) => {
    console.log('📈 Testing CSV file upload...');
    
    const csvContent = `Product,Category,Price,Stock,Supplier
Widget A,Electronics,299.99,150,TechSupply Co
Widget B,Electronics,199.99,200,TechSupply Co
Gadget X,Tools,89.99,75,ToolCorp Ltd
Gadget Y,Tools,149.99,100,ToolCorp Ltd
Device Z,Electronics,499.99,50,ElectroWorld

Product Categories:
- Electronics: 3 items
- Tools: 2 items

Total Inventory Value: $8,549.25
Suppliers: TechSupply Co, ToolCorp Ltd, ElectroWorld

This CSV contains product inventory data for testing.`;
    
    const uploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await uploadButton.click();
    const fileChooser = await fileChooserPromise;
    
    await fileChooser.setFiles([{
      name: 'product-inventory.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    }]);
    
    const result = await waitForUploadCompletion(page, 'product-inventory.csv');
    expect(result.status).toBe('completed');
    
    // Verify document appears in list
    const csvDocument = page.locator('text=product-inventory.csv').first();
    await expect(csvDocument).toBeVisible({ timeout: 10000 });
    
    console.log('✅ CSV file upload successful');
  });

  test('should upload and process image files', async ({ page }) => {
    console.log('🖼️ Testing image file upload...');
    
    // Create a minimal PNG file (1x1 pixel)
    const pngData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
      0x49, 0x48, 0x44, 0x52, // IHDR
      0x00, 0x00, 0x00, 0x01, // Width: 1
      0x00, 0x00, 0x00, 0x01, // Height: 1
      0x08, 0x02, 0x00, 0x00, 0x00, // Bit depth, color type, compression, filter, interlace
      0x90, 0x77, 0x53, 0xDE, // CRC
      0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
      0x49, 0x44, 0x41, 0x54, // IDAT
      0x08, 0x99, 0x01, 0x01, 0x00, 0x01, 0x00, 0xFE, 0xFF, 0x00, 0x00, 0x00, // Image data
      0x02, 0x00, 0x01, 0xE5, // CRC
      0x00, 0x00, 0x00, 0x00, // IEND chunk length
      0x49, 0x45, 0x4E, 0x44, // IEND
      0xAE, 0x42, 0x60, 0x82  // CRC
    ]);
    
    const uploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await uploadButton.click();
    const fileChooser = await fileChooserPromise;
    
    await fileChooser.setFiles([{
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: pngData
    }]);
    
    const result = await waitForUploadCompletion(page, 'test-image.png');
    expect(result.status).toBe('completed');
    
    // Verify document appears in list
    const imageDocument = page.locator('text=test-image.png').first();
    await expect(imageDocument).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Image file upload successful');
  });

  test('should handle unsupported file types gracefully', async ({ page }) => {
    console.log('⚠️ Testing unsupported file type handling...');
    
    const unsupportedContent = `This is an unsupported file type for testing error handling.`;
    
    const uploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await uploadButton.click();
    const fileChooser = await fileChooserPromise;
    
    await fileChooser.setFiles([{
      name: 'unsupported-file.xyz',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from(unsupportedContent)
    }]);
    
    // Wait for error handling
    await page.waitForTimeout(5000);
    
    // Look for error messages
    const errorIndicators = [
      page.locator('text=unsupported'),
      page.locator('text=not supported'),
      page.locator('text=invalid file'),
      page.locator('text=error')
    ];
    
    let foundError = false;
    for (const indicator of errorIndicators) {
      if (await indicator.first().isVisible()) {
        console.log('✅ Unsupported file type error handling working');
        foundError = true;
        break;
      }
    }
    
    expect(foundError).toBeTruthy();
  });

  test('should handle file size limit validation', async ({ page }) => {
    console.log('📏 Testing file size limit validation...');
    
    // Create a large content string (simulating oversized file)
    const largeContent = 'This is a test of file size limits. '.repeat(50000); // ~1.7MB
    
    // Intercept upload to simulate size limit error
    await page.route('**/api/documents/upload*', async route => {
      await route.fulfill({
        status: 413,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'File too large. Maximum size is 50MB' })
      });
    });
    
    const uploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await uploadButton.click();
    const fileChooser = await fileChooserPromise;
    
    await fileChooser.setFiles([{
      name: 'large-test-file.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(largeContent)
    }]);
    
    // Wait for size validation error
    await page.waitForTimeout(5000);
    
    // Look for size limit error
    const sizeErrorIndicators = [
      page.locator('text=too large'),
      page.locator('text=file size'),
      page.locator('text=50MB'),
      page.locator('text=limit')
    ];
    
    let foundSizeError = false;
    for (const indicator of sizeErrorIndicators) {
      if (await indicator.first().isVisible()) {
        console.log('✅ File size limit validation working');
        foundSizeError = true;
        break;
      }
    }
    
    expect(foundSizeError).toBeTruthy();
    
    // Remove route interception
    await page.unroute('**/api/documents/upload*');
  });

  test('should test file format recognition and icons', async ({ page }) => {
    console.log('🎨 Testing file format recognition and UI indicators...');
    
    const testFiles = [
      { name: 'document.pdf', mime: 'application/pdf', content: 'PDF test content' },
      { name: 'spreadsheet.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', content: 'Excel test content' },
      { name: 'text-file.txt', mime: 'text/plain', content: 'Plain text test content' },
      { name: 'data.csv', mime: 'text/csv', content: 'CSV,test,content\n1,2,3' }
    ];
    
    for (const testFile of testFiles) {
      const uploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
      
      const fileChooserPromise = page.waitForEvent('filechooser');
      await uploadButton.click();
      const fileChooser = await fileChooserPromise;
      
      await fileChooser.setFiles([{
        name: testFile.name,
        mimeType: testFile.mime,
        buffer: Buffer.from(testFile.content)
      }]);
      
      // Wait for upload and check for file type recognition
      await page.waitForTimeout(3000);
      
      // Look for file in the document list
      const fileElement = page.locator(`text=${testFile.name}`).first();
      if (await fileElement.isVisible()) {
        console.log(`✅ File ${testFile.name} uploaded and recognized`);
        
        // Check for file type indicators (icons, labels)
        const fileExtension = testFile.name.split('.').pop()?.toUpperCase();
        const typeIndicator = page.locator(`text=${fileExtension}`).first();
        
        if (await typeIndicator.isVisible()) {
          console.log(`📄 File type ${fileExtension} properly indicated`);
        }
      }
      
      await page.waitForTimeout(2000);
    }
    
    console.log('✅ File format recognition testing completed');
  });
});

test.describe('File Upload Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
    await page.goto('/dashboard/documents');
    await page.waitForTimeout(2000);
  });

  test('should handle empty files', async ({ page }) => {
    console.log('📭 Testing empty file upload...');
    
    const uploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await uploadButton.click();
    const fileChooser = await fileChooserPromise;
    
    await fileChooser.setFiles([{
      name: 'empty-file.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('')
    }]);
    
    // Wait for handling of empty file
    await page.waitForTimeout(5000);
    
    // System should either reject empty files or handle them gracefully
    const emptyFileHandling = [
      page.locator('text=empty'),
      page.locator('text=no content'),
      page.locator('text=file is empty'),
      page.locator('text=empty-file.txt')
    ];
    
    let handledProperly = false;
    for (const indicator of emptyFileHandling) {
      if (await indicator.first().isVisible()) {
        console.log('✅ Empty file handled appropriately');
        handledProperly = true;
        break;
      }
    }
    
    expect(handledProperly).toBeTruthy();
  });

  test('should handle files with special characters in names', async ({ page }) => {
    console.log('🔤 Testing special character filename handling...');
    
    const specialFiles = [
      { name: 'file with spaces.txt', content: 'Space test content' },
      { name: 'file-with-dashes.txt', content: 'Dash test content' },
      { name: 'file_with_underscores.txt', content: 'Underscore test content' },
      { name: 'file(with)parentheses.txt', content: 'Parentheses test content' }
    ];
    
    for (const specialFile of specialFiles) {
      const uploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
      
      const fileChooserPromise = page.waitForEvent('filechooser');
      await uploadButton.click();
      const fileChooser = await fileChooserPromise;
      
      await fileChooser.setFiles([{
        name: specialFile.name,
        mimeType: 'text/plain',
        buffer: Buffer.from(specialFile.content)
      }]);
      
      await page.waitForTimeout(3000);
      
      // Check if file with special characters is handled properly
      const fileElement = page.locator(`text=${specialFile.name}`).first();
      const fileHandled = await fileElement.isVisible() || 
                         await page.locator('text=uploaded successfully').first().isVisible();
      
      if (fileHandled) {
        console.log(`✅ Special character filename "${specialFile.name}" handled correctly`);
      }
      
      await page.waitForTimeout(1000);
    }
  });

  test('should handle multiple simultaneous uploads', async ({ page }) => {
    console.log('🔄 Testing multiple simultaneous uploads...');
    
    const multipleFiles = [
      { name: 'multi-test-1.txt', content: 'Multi upload test file 1' },
      { name: 'multi-test-2.txt', content: 'Multi upload test file 2' },
      { name: 'multi-test-3.txt', content: 'Multi upload test file 3' }
    ];
    
    const uploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await uploadButton.click();
    const fileChooser = await fileChooserPromise;
    
    // Upload multiple files at once
    await fileChooser.setFiles(multipleFiles.map(file => ({
      name: file.name,
      mimeType: 'text/plain',
      buffer: Buffer.from(file.content)
    })));
    
    // Wait for all uploads to process
    await page.waitForTimeout(10000);
    
    // Check if all files are handled
    let successfulUploads = 0;
    for (const file of multipleFiles) {
      const fileElement = page.locator(`text=${file.name}`).first();
      if (await fileElement.isVisible()) {
        successfulUploads++;
      }
    }
    
    console.log(`✅ ${successfulUploads}/${multipleFiles.length} simultaneous uploads successful`);
    expect(successfulUploads).toBeGreaterThanOrEqual(2);
  });
});
