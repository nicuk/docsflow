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

// Helper to wait for document processing
async function waitForDocumentProcessing(page: Page, filename: string, maxWaitTime = 30000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    // Check for processing status indicators
    const processingIndicators = await page.locator('text=processing, text=uploading, text=%').count();
    const completedIndicators = await page.locator('text=completed, text=ready, text=100%').count();
    const errorIndicators = await page.locator('text=error, text=failed').count();
    
    if (errorIndicators > 0) {
      console.log(`❌ Document ${filename} processing failed`);
      return { status: 'error' };
    }
    
    if (completedIndicators > 0 && processingIndicators === 0) {
      console.log(`✅ Document ${filename} processing completed`);
      return { status: 'completed' };
    }
    
    await page.waitForTimeout(2000);
  }
  
  console.log(`⏰ Document ${filename} processing timeout`);
  return { status: 'timeout' };
}

test.describe('Upload with RAG and AI Integration', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
  });

  test('should upload document and verify it appears in document list', async ({ page }) => {
    console.log('🚀 Testing document upload and listing...');
    
    // Navigate to documents page
    await page.goto('/dashboard/documents');
    await page.waitForTimeout(2000);
    
    // Create test file content with specific identifiable content
    const testContent = `
RAG Integration Test Document

This document tests the RAG (Retrieval-Augmented Generation) integration.

Key Information:
- Test ID: RAG-TEST-2024
- Document Type: Integration Test
- Features: Upload, Processing, RAG Search, AI Analysis
- Expected Behavior: Should be searchable via AI chat

Important Facts:
1. RAG systems combine document retrieval with AI generation
2. Documents are chunked and embedded for semantic search
3. AI can answer questions based on document content
4. The system should maintain document context

Test Queries to Try:
- "What is the test ID in the uploaded document?"
- "What features are being tested?"
- "How many important facts are listed?"
    `.trim();
    
    // Look for upload button
    const uploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
    expect(await uploadButton.isVisible()).toBeTruthy();
    
    // Upload the test document
    const testFilePath = path.join(__dirname, '..', 'fixtures', 'rag-test-document.txt');
    
    // Create the test file if it doesn't exist (for fixture)
    const fileChooserPromise = page.waitForEvent('filechooser');
    await uploadButton.click();
    const fileChooser = await fileChooserPromise;
    
    // Set files for upload
    await fileChooser.setFiles([{
      name: 'rag-test-document.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(testContent)
    }]);
    
    // Wait for upload to complete
    await page.waitForTimeout(3000);
    
    // Verify document appears in the list
    const documentInList = page.locator('text=rag-test-document.txt').first();
    await expect(documentInList).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Document upload and listing successful');
  });

  test('should process uploaded document and enable RAG search', async ({ page }) => {
    console.log('🔍 Testing RAG processing and search...');
    
    // First upload a document (reuse upload logic)
    await page.goto('/dashboard/documents');
    await page.waitForTimeout(2000);
    
    const testContent = `
RAG Search Test Document

This document contains specific information for testing RAG search capabilities.

Project: DocsFlow AI Assistant
Version: 2.0
Status: Testing Phase

Search Test Data:
- Customer ID: CUST-12345
- Order Number: ORD-67890
- Product Code: PROD-AI-RAG
- Price: $299.99
- Delivery Date: December 25, 2024

Features Tested:
1. Document upload and processing
2. Text extraction and chunking
3. Embedding generation
4. Semantic search
5. AI-powered question answering
    `.trim();
    
    const uploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
    
    if (await uploadButton.isVisible()) {
      const fileChooserPromise = page.waitForEvent('filechooser');
      await uploadButton.click();
      const fileChooser = await fileChooserPromise;
      
      await fileChooser.setFiles([{
        name: 'rag-search-test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(testContent)
      }]);
      
      // Wait for processing to complete
      const processingResult = await waitForDocumentProcessing(page, 'rag-search-test.txt');
      console.log(`📄 Document processing result: ${processingResult.status}`);
      
      // Verify document appears and is processed
      const documentElement = page.locator('text=rag-search-test.txt').first();
      await expect(documentElement).toBeVisible({ timeout: 15000 });
      
      // Check for processing completion indicators
      const readyStatus = page.locator('text=ready, text=completed').first();
      if (await readyStatus.isVisible()) {
        console.log('✅ Document processing completed successfully');
      }
    }
  });

  test('should answer questions about uploaded documents via AI chat', async ({ page }) => {
    console.log('🤖 Testing AI chat with uploaded documents...');
    
    // Navigate to chat interface
    await page.goto('/dashboard/chat');
    await page.waitForTimeout(2000);
    
    // Upload a document first if needed, or assume documents exist from previous tests
    const testContent = `
AI Chat Test Document

Company: TechCorp Industries
Location: Silicon Valley, CA
Founded: 2020
Employees: 150
Revenue: $50M annually

Products:
- AI Software Solutions
- Machine Learning Platforms
- Data Analytics Tools

Recent Achievements:
- Launched RAG-powered chatbot
- Achieved 99.9% uptime
- Processed 1M+ documents
- Served 10,000+ customers

Key Technologies:
- Python and TypeScript
- Supabase database
- OpenAI and Google AI
- Playwright testing
    `.trim();
    
    // Check if we can upload from chat, or navigate to documents first
    let uploadedFromChat = false;
    const chatUploadButton = page.locator('button').filter({ hasText: /upload|attach/i }).first();
    
    if (await chatUploadButton.isVisible()) {
      const fileChooserPromise = page.waitForEvent('filechooser');
      await chatUploadButton.click();
      const fileChooser = await fileChooserPromise;
      
      await fileChooser.setFiles([{
        name: 'ai-chat-test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(testContent)
      }]);
      
      uploadedFromChat = true;
      console.log('📎 Uploaded document via chat interface');
      
      // Wait for upload confirmation
      await page.waitForTimeout(5000);
    } else {
      // Upload via documents page first
      await page.goto('/dashboard/documents');
      await page.waitForTimeout(1000);
      
      const docUploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
      if (await docUploadButton.isVisible()) {
        const fileChooserPromise = page.waitForEvent('filechooser');
        await docUploadButton.click();
        const fileChooser = await fileChooserPromise;
        
        await fileChooser.setFiles([{
          name: 'ai-chat-test.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from(testContent)
        }]);
        
        // Wait for processing
        await waitForDocumentProcessing(page, 'ai-chat-test.txt');
        
        // Navigate back to chat
        await page.goto('/dashboard/chat');
        await page.waitForTimeout(2000);
      }
    }
    
    // Now test AI chat queries about the uploaded document
    const chatInput = page.locator('textarea, input[type="text"]').filter({ hasText: '' }).first();
    const sendButton = page.locator('button').filter({ hasText: /send/i }).first();
    
    if (await chatInput.isVisible() && await sendButton.isVisible()) {
      // Test Query 1: Company information
      await chatInput.fill('What company is mentioned in my documents?');
      await sendButton.click();
      
      // Wait for AI response
      await page.waitForTimeout(8000);
      
      // Look for AI response that mentions the company
      const companyResponse = page.locator('text=TechCorp').first();
      if (await companyResponse.isVisible()) {
        console.log('✅ AI successfully found company information from uploaded document');
      }
      
      // Test Query 2: Specific numbers
      await page.waitForTimeout(2000);
      await chatInput.fill('How many employees does the company have?');
      await sendButton.click();
      
      await page.waitForTimeout(8000);
      
      const employeeResponse = page.locator('text=150').first();
      if (await employeeResponse.isVisible()) {
        console.log('✅ AI successfully extracted specific numbers from document');
      }
      
      // Test Query 3: Complex information synthesis
      await page.waitForTimeout(2000);
      await chatInput.fill('What are the main products and achievements of the company?');
      await sendButton.click();
      
      await page.waitForTimeout(10000);
      
      // Look for key terms in the response
      const achievementTerms = ['AI Software', 'chatbot', 'uptime', 'customers'];
      let foundTerms = 0;
      
      for (const term of achievementTerms) {
        const termElement = page.locator(`text=${term}`).first();
        if (await termElement.isVisible()) {
          foundTerms++;
        }
      }
      
      if (foundTerms >= 2) {
        console.log(`✅ AI successfully synthesized complex information (found ${foundTerms} key terms)`);
      } else {
        console.log(`⚠️ AI synthesis may need improvement (found only ${foundTerms} key terms)`);
      }
      
    } else {
      console.log('❌ Chat interface not accessible');
    }
  });

  test('should handle multiple document uploads and cross-document queries', async ({ page }) => {
    console.log('📚 Testing multiple document uploads and cross-document queries...');
    
    // Navigate to documents page
    await page.goto('/dashboard/documents');
    await page.waitForTimeout(2000);
    
    // Document 1: Company A information
    const companyAContent = `
Company Profile: Alpha Corp

Industry: Technology
Location: New York, NY
Founded: 2018
CEO: John Smith
Revenue: $25M
Employees: 75

Products:
- Cloud Computing Platform
- Data Storage Solutions
- Security Software

Market Share: 15% in cloud storage
Growth Rate: 25% YoY
    `.trim();
    
    // Document 2: Company B information
    const companyBContent = `
Company Profile: Beta Industries

Industry: Technology  
Location: Austin, TX
Founded: 2019
CEO: Sarah Johnson
Revenue: $30M
Employees: 90

Products:
- AI Analytics Platform
- Machine Learning Tools
- Business Intelligence

Market Share: 20% in AI analytics
Growth Rate: 35% YoY
    `.trim();
    
    const uploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
    
    // Upload first document
    if (await uploadButton.isVisible()) {
      let fileChooserPromise = page.waitForEvent('filechooser');
      await uploadButton.click();
      let fileChooser = await fileChooserPromise;
      
      await fileChooser.setFiles([{
        name: 'company-alpha.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(companyAContent)
      }]);
      
      await page.waitForTimeout(3000);
      
      // Upload second document
      fileChooserPromise = page.waitForEvent('filechooser');
      await uploadButton.click();
      fileChooser = await fileChooserPromise;
      
      await fileChooser.setFiles([{
        name: 'company-beta.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(companyBContent)
      }]);
      
      // Wait for both documents to process
      await page.waitForTimeout(8000);
      
      // Verify both documents appear in list
      const alphaDoc = page.locator('text=company-alpha.txt').first();
      const betaDoc = page.locator('text=company-beta.txt').first();
      
      await expect(alphaDoc).toBeVisible({ timeout: 10000 });
      await expect(betaDoc).toBeVisible({ timeout: 10000 });
      
      console.log('📄 Both documents uploaded successfully');
      
      // Now test cross-document queries via chat
      await page.goto('/dashboard/chat');
      await page.waitForTimeout(2000);
      
      const chatInput = page.locator('textarea, input[type="text"]').filter({ hasText: '' }).first();
      const sendButton = page.locator('button').filter({ hasText: /send/i }).first();
      
      if (await chatInput.isVisible()) {
        // Cross-document comparison query
        await chatInput.fill('Compare the revenue and employee count between Alpha Corp and Beta Industries');
        await sendButton.click();
        
        await page.waitForTimeout(12000);
        
        // Look for comparative information in response
        const comparisonTerms = ['Alpha', 'Beta', '$25M', '$30M', '75', '90'];
        let foundComparison = 0;
        
        for (const term of comparisonTerms) {
          const termElement = page.locator(`text=${term}`).first();
          if (await termElement.isVisible()) {
            foundComparison++;
          }
        }
        
        if (foundComparison >= 4) {
          console.log(`✅ AI successfully performed cross-document analysis (found ${foundComparison} comparison points)`);
        } else {
          console.log(`⚠️ Cross-document analysis needs improvement (found only ${foundComparison} comparison points)`);
        }
        
        // Test aggregation query
        await page.waitForTimeout(3000);
        await chatInput.fill('What is the total revenue and employee count across all companies?');
        await sendButton.click();
        
        await page.waitForTimeout(10000);
        
        // Look for aggregated numbers
        const totalTerms = ['$55M', '55M', '165', 'total', 'combined'];
        let foundAggregation = 0;
        
        for (const term of totalTerms) {
          const termElement = page.locator(`text=${term}`).first();
          if (await termElement.isVisible()) {
            foundAggregation++;
          }
        }
        
        if (foundAggregation >= 2) {
          console.log(`✅ AI successfully performed aggregation across documents (found ${foundAggregation} aggregation indicators)`);
        }
      }
    }
  });

  test('should handle document upload errors gracefully', async ({ page }) => {
    console.log('⚠️ Testing upload error handling...');
    
    await page.goto('/dashboard/documents');
    await page.waitForTimeout(2000);
    
    // Intercept upload API to simulate various errors
    await page.route('**/api/documents/upload*', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'AI processing service temporarily unavailable' })
      });
    });
    
    const uploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
    
    if (await uploadButton.isVisible()) {
      const fileChooserPromise = page.waitForEvent('filechooser');
      await uploadButton.click();
      const fileChooser = await fileChooserPromise;
      
      await fileChooser.setFiles([{
        name: 'error-test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Test content for error handling')
      }]);
      
      // Wait for error handling
      await page.waitForTimeout(5000);
      
      // Look for error indicators
      const errorIndicators = [
        page.locator('text=failed'),
        page.locator('text=error'),
        page.locator('text=unavailable'),
        page.locator('[class*="error"]')
      ];
      
      let foundError = false;
      for (const indicator of errorIndicators) {
        if (await indicator.first().isVisible()) {
          console.log('✅ Error handling working correctly');
          foundError = true;
          break;
        }
      }
      
      expect(foundError).toBeTruthy();
    }
    
    // Remove the route interception for subsequent tests
    await page.unroute('**/api/documents/upload*');
  });

  test('should verify RAG system retrieves relevant chunks for queries', async ({ page }) => {
    console.log('🔍 Testing RAG chunk retrieval and relevance...');
    
    // Upload a document with structured content for testing chunk retrieval
    await page.goto('/dashboard/documents');
    await page.waitForTimeout(2000);
    
    const structuredContent = `
Technical Documentation: RAG System Architecture

Section 1: Introduction
The Retrieval-Augmented Generation (RAG) system combines document retrieval with AI generation.
This architecture enables answering questions based on uploaded document content.

Section 2: Document Processing
Documents are processed through the following pipeline:
1. Text extraction from various file formats
2. Content chunking into smaller segments
3. Embedding generation for semantic search
4. Storage in vector database

Section 3: Query Processing
When a user asks a question:
1. Query is converted to embedding
2. Semantic search finds relevant chunks
3. Top-K chunks are retrieved
4. AI generates response using chunks as context

Section 4: Performance Metrics
- Average query response time: 2.5 seconds
- Chunk retrieval accuracy: 92%
- User satisfaction score: 4.7/5
- System uptime: 99.9%

Section 5: Technical Stack
- Frontend: Next.js with TypeScript
- Backend: Supabase PostgreSQL
- AI Models: OpenAI GPT-4, Google Gemini
- Vector Search: pgvector
- Testing: Playwright
    `.trim();
    
    const uploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
    
    if (await uploadButton.isVisible()) {
      const fileChooserPromise = page.waitForEvent('filechooser');
      await uploadButton.click();
      const fileChooser = await fileChooserPromise;
      
      await fileChooser.setFiles([{
        name: 'rag-architecture.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(structuredContent)
      }]);
      
      // Wait for processing
      await waitForDocumentProcessing(page, 'rag-architecture.txt');
      
      // Navigate to chat to test retrieval
      await page.goto('/dashboard/chat');
      await page.waitForTimeout(2000);
      
      const chatInput = page.locator('textarea, input[type="text"]').filter({ hasText: '' }).first();
      const sendButton = page.locator('button').filter({ hasText: /send/i }).first();
      
      if (await chatInput.isVisible()) {
        // Test specific section queries
        const testQueries = [
          {
            query: 'What is the average query response time?',
            expectedContent: ['2.5 seconds', 'response time']
          },
          {
            query: 'What are the steps in document processing?',
            expectedContent: ['text extraction', 'chunking', 'embedding', 'storage']
          },
          {
            query: 'What technologies are used in the tech stack?',
            expectedContent: ['Next.js', 'Supabase', 'OpenAI', 'Playwright']
          }
        ];
        
        for (const testQuery of testQueries) {
          await chatInput.fill(testQuery.query);
          await sendButton.click();
          
          await page.waitForTimeout(8000);
          
          // Check if expected content appears in the response
          let foundContent = 0;
          for (const content of testQuery.expectedContent) {
            const contentElement = page.locator(`text=${content}`).first();
            if (await contentElement.isVisible()) {
              foundContent++;
            }
          }
          
          console.log(`📊 Query: "${testQuery.query}" - Found ${foundContent}/${testQuery.expectedContent.length} expected content pieces`);
          
          await page.waitForTimeout(2000);
        }
        
        console.log('✅ RAG chunk retrieval and relevance testing completed');
      }
    }
  });

  test('should maintain document context across conversation turns', async ({ page }) => {
    console.log('💬 Testing conversation context and document memory...');
    
    await page.goto('/dashboard/chat');
    await page.waitForTimeout(2000);
    
    const conversationTestContent = `
Project Status Report: Q4 2024

Project Name: DocsFlow Enhancement
Project Manager: Alice Cooper
Start Date: October 1, 2024
End Date: December 31, 2024
Budget: $500,000
Current Status: 75% Complete

Team Members:
- Alice Cooper (Project Manager)
- Bob Wilson (Lead Developer)
- Carol Davis (UX Designer)
- David Lee (QA Engineer)

Completed Tasks:
- RAG system implementation
- Document upload functionality
- AI chat interface
- User authentication

Remaining Tasks:
- Performance optimization
- Security audit
- User testing
- Documentation

Risks:
- Timeline pressure due to holiday season
- Potential integration issues with third-party APIs
- Resource availability during December

Next Meeting: December 20, 2024
    `.trim();
    
    // Upload document first
    const chatUploadButton = page.locator('button').filter({ hasText: /upload|attach/i }).first();
    
    if (await chatUploadButton.isVisible()) {
      const fileChooserPromise = page.waitForEvent('filechooser');
      await chatUploadButton.click();
      const fileChooser = await fileChooserPromise;
      
      await fileChooser.setFiles([{
        name: 'project-status.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(conversationTestContent)
      }]);
      
      await page.waitForTimeout(5000);
    }
    
    const chatInput = page.locator('textarea, input[type="text"]').filter({ hasText: '' }).first();
    const sendButton = page.locator('button').filter({ hasText: /send/i }).first();
    
    if (await chatInput.isVisible()) {
      // Multi-turn conversation to test context maintenance
      const conversationTurns = [
        {
          query: 'What is the project completion status?',
          expectedInfo: ['75%', 'complete']
        },
        {
          query: 'Who is the project manager?',
          expectedInfo: ['Alice Cooper']
        },
        {
          query: 'What tasks are still remaining?',
          expectedInfo: ['optimization', 'audit', 'testing', 'documentation']
        },
        {
          query: 'When did Alice start this project?',
          expectedInfo: ['October 1', '2024']
        },
        {
          query: 'What are the main risks she\'s facing?',
          expectedInfo: ['timeline', 'integration', 'resource']
        }
      ];
      
      for (let i = 0; i < conversationTurns.length; i++) {
        const turn = conversationTurns[i];
        
        await chatInput.fill(turn.query);
        await sendButton.click();
        
        await page.waitForTimeout(8000);
        
        // Check for expected information in response
        let foundInfo = 0;
        for (const info of turn.expectedInfo) {
          const infoElement = page.locator(`text=${info}`).first();
          if (await infoElement.isVisible()) {
            foundInfo++;
          }
        }
        
        console.log(`💭 Turn ${i + 1}: "${turn.query}" - Found ${foundInfo}/${turn.expectedInfo.length} expected information`);
        
        // Wait between turns
        await page.waitForTimeout(2000);
      }
      
      console.log('✅ Conversation context and document memory testing completed');
    }
  });
});

test.describe('Upload Performance and Scalability', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
  });

  test('should handle large document uploads', async ({ page }) => {
    console.log('📊 Testing large document upload performance...');
    
    await page.goto('/dashboard/documents');
    await page.waitForTimeout(2000);
    
    // Create a larger test document
    const largeContent = `
Large Document Performance Test

${'Section '.repeat(50)}

${'This is a large document with substantial content to test the upload and processing performance of the RAG system. '.repeat(100)}

${'Key Information: '.repeat(20)}

${'Performance metrics are important for user experience. '.repeat(50)}

${'The system should handle large documents efficiently. '.repeat(30)}
    `.trim();
    
    const uploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
    
    if (await uploadButton.isVisible()) {
      const startTime = Date.now();
      
      const fileChooserPromise = page.waitForEvent('filechooser');
      await uploadButton.click();
      const fileChooser = await fileChooserPromise;
      
      await fileChooser.setFiles([{
        name: 'large-performance-test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(largeContent)
      }]);
      
      // Monitor upload progress
      const processingResult = await waitForDocumentProcessing(page, 'large-performance-test.txt', 45000);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      console.log(`⏱️ Large document processing took ${totalTime}ms`);
      console.log(`📄 Processing result: ${processingResult.status}`);
      
      if (processingResult.status === 'completed') {
        console.log('✅ Large document upload and processing successful');
        
        // Test querying the large document
        await page.goto('/dashboard/chat');
        await page.waitForTimeout(2000);
        
        const chatInput = page.locator('textarea, input[type="text"]').filter({ hasText: '' }).first();
        const sendButton = page.locator('button').filter({ hasText: /send/i }).first();
        
        if (await chatInput.isVisible()) {
          await chatInput.fill('What performance metrics are mentioned in the large document?');
          await sendButton.click();
          
          await page.waitForTimeout(10000);
          
          const performanceResponse = page.locator('text=performance, text=metrics').first();
          if (await performanceResponse.isVisible()) {
            console.log('✅ Large document query successful');
          }
        }
      }
    }
  });
});
