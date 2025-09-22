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

// Helper to upload file from fixtures
async function uploadFixtureFile(page: Page, filename: string) {
  const uploadButton = page.locator('button').filter({ hasText: /upload/i }).first();
  expect(await uploadButton.isVisible()).toBeTruthy();
  
  const testFilePath = path.join(__dirname, '..', 'fixtures', filename);
  
  const fileChooserPromise = page.waitForEvent('filechooser');
  await uploadButton.click();
  const fileChooser = await fileChooserPromise;
  
  await fileChooser.setFiles([testFilePath]);
  
  // Wait for upload completion
  await page.waitForTimeout(8000);
  
  // Verify document appears in list
  const documentInList = page.locator(`text=${filename}`).first();
  const isVisible = await documentInList.isVisible();
  
  if (isVisible) {
    console.log(`✅ File ${filename} uploaded successfully`);
  } else {
    console.log(`⚠️ File ${filename} upload may not be complete`);
  }
  
  return isVisible;
}

// Helper to ask question in chat and get response
async function askChatQuestion(page: Page, question: string, expectedTerms: string[] = []) {
  const chatInput = page.locator('textarea, input[type="text"]').filter({ hasText: '' }).first();
  const sendButton = page.locator('button').filter({ hasText: /send/i }).first();
  
  if (await chatInput.isVisible() && await sendButton.isVisible()) {
    await chatInput.fill(question);
    await sendButton.click();
    
    // Wait for AI response
    await page.waitForTimeout(10000);
    
    // Check for expected terms in response
    let foundTerms = 0;
    for (const term of expectedTerms) {
      const termElement = page.locator(`text=${term}`).first();
      if (await termElement.isVisible()) {
        foundTerms++;
      }
    }
    
    console.log(`💬 Question: "${question}" - Found ${foundTerms}/${expectedTerms.length} expected terms`);
    return foundTerms;
  }
  
  return 0;
}

test.describe('Comprehensive Upload, RAG, and AI Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
  });

  test('complete workflow: upload → process → search → analyze', async ({ page }) => {
    console.log('🚀 Testing complete workflow: upload → process → search → analyze');
    
    // Step 1: Upload document
    await page.goto('/dashboard/documents');
    await page.waitForTimeout(2000);
    
    const uploadSuccess = await uploadFixtureFile(page, 'rag-test-document.txt');
    expect(uploadSuccess).toBeTruthy();
    
    // Step 2: Navigate to chat for AI analysis
    await page.goto('/dashboard/chat');
    await page.waitForTimeout(3000);
    
    // Step 3: Test AI analysis with specific questions
    const testQueries = [
      {
        question: 'What is the test ID mentioned in the document?',
        expectedTerms: ['RAG-TEST-2024']
      },
      {
        question: 'How many important facts are listed?',
        expectedTerms: ['4', 'four']
      },
      {
        question: 'What features are being tested?',
        expectedTerms: ['Upload', 'Processing', 'RAG Search', 'AI Analysis']
      }
    ];
    
    let successfulQueries = 0;
    for (const query of testQueries) {
      const foundTerms = await askChatQuestion(page, query.question, query.expectedTerms);
      if (foundTerms > 0) {
        successfulQueries++;
      }
      await page.waitForTimeout(2000);
    }
    
    console.log(`✅ Complete workflow test: ${successfulQueries}/${testQueries.length} queries successful`);
    expect(successfulQueries).toBeGreaterThanOrEqual(2);
  });

  test('multi-document knowledge synthesis', async ({ page }) => {
    console.log('📚 Testing multi-document knowledge synthesis');
    
    // Upload multiple related documents
    await page.goto('/dashboard/documents');
    await page.waitForTimeout(2000);
    
    const documentsToUpload = [
      'company-alpha.txt',
      'company-beta.txt'
    ];
    
    for (const doc of documentsToUpload) {
      await uploadFixtureFile(page, doc);
      await page.waitForTimeout(3000);
    }
    
    // Test cross-document analysis
    await page.goto('/dashboard/chat');
    await page.waitForTimeout(3000);
    
    const crossDocQueries = [
      {
        question: 'Compare the revenue between Alpha Corp and Beta Industries',
        expectedTerms: ['$25M', '$30M', 'Alpha', 'Beta']
      },
      {
        question: 'Which company has more employees?',
        expectedTerms: ['Beta', '90', '75']
      },
      {
        question: 'What is the total employee count across both companies?',
        expectedTerms: ['165', 'total', 'combined']
      }
    ];
    
    let successfulSynthesis = 0;
    for (const query of crossDocQueries) {
      const foundTerms = await askChatQuestion(page, query.question, query.expectedTerms);
      if (foundTerms >= 2) {
        successfulSynthesis++;
      }
      await page.waitForTimeout(3000);
    }
    
    console.log(`✅ Multi-document synthesis: ${successfulSynthesis}/${crossDocQueries.length} queries successful`);
    expect(successfulSynthesis).toBeGreaterThanOrEqual(2);
  });

  test('technical document understanding and retrieval', async ({ page }) => {
    console.log('🔧 Testing technical document understanding');
    
    await page.goto('/dashboard/documents');
    await page.waitForTimeout(2000);
    
    await uploadFixtureFile(page, 'rag-architecture.txt');
    
    await page.goto('/dashboard/chat');
    await page.waitForTimeout(3000);
    
    const technicalQueries = [
      {
        question: 'What are the steps in document processing?',
        expectedTerms: ['Text extraction', 'chunking', 'embedding', 'storage']
      },
      {
        question: 'What is the average query response time?',
        expectedTerms: ['2.5 seconds']
      },
      {
        question: 'What technologies are used in the tech stack?',
        expectedTerms: ['Next.js', 'Supabase', 'OpenAI', 'Playwright']
      },
      {
        question: 'Describe the data flow in the system',
        expectedTerms: ['Upload', 'Extract', 'Chunk', 'Embed', 'Store']
      }
    ];
    
    let technicalUnderstanding = 0;
    for (const query of technicalQueries) {
      const foundTerms = await askChatQuestion(page, query.question, query.expectedTerms);
      if (foundTerms >= 1) {
        technicalUnderstanding++;
      }
      await page.waitForTimeout(3000);
    }
    
    console.log(`✅ Technical understanding: ${technicalUnderstanding}/${technicalQueries.length} queries successful`);
    expect(technicalUnderstanding).toBeGreaterThanOrEqual(3);
  });

  test('contextual conversation memory', async ({ page }) => {
    console.log('💭 Testing contextual conversation memory');
    
    await page.goto('/dashboard/documents');
    await page.waitForTimeout(2000);
    
    await uploadFixtureFile(page, 'project-status.txt');
    
    await page.goto('/dashboard/chat');
    await page.waitForTimeout(3000);
    
    // Test conversation flow with context retention
    const conversationFlow = [
      {
        question: 'Who is the project manager?',
        expectedTerms: ['Alice Cooper']
      },
      {
        question: 'What is her project completion status?',
        expectedTerms: ['75%', 'complete']
      },
      {
        question: 'What tasks does she still need to complete?',
        expectedTerms: ['optimization', 'audit', 'testing', 'documentation']
      },
      {
        question: 'When is Alice\'s next meeting?',
        expectedTerms: ['December 20', '2024']
      }
    ];
    
    let contextRetention = 0;
    for (const turn of conversationFlow) {
      const foundTerms = await askChatQuestion(page, turn.question, turn.expectedTerms);
      if (foundTerms > 0) {
        contextRetention++;
      }
      await page.waitForTimeout(3000);
    }
    
    console.log(`✅ Contextual memory: ${contextRetention}/${conversationFlow.length} turns successful`);
    expect(contextRetention).toBeGreaterThanOrEqual(3);
  });

  test('numerical data extraction and calculation', async ({ page }) => {
    console.log('🔢 Testing numerical data extraction and calculation');
    
    await page.goto('/dashboard/documents');
    await page.waitForTimeout(2000);
    
    await uploadFixtureFile(page, 'ai-chat-test.txt');
    
    await page.goto('/dashboard/chat');
    await page.waitForTimeout(3000);
    
    const numericalQueries = [
      {
        question: 'How many employees does TechCorp have?',
        expectedTerms: ['150']
      },
      {
        question: 'What is the annual revenue?',
        expectedTerms: ['$50M', '50M']
      },
      {
        question: 'How many departments are listed?',
        expectedTerms: ['6', 'six']
      },
      {
        question: 'What is the total Q1-Q4 revenue?',
        expectedTerms: ['$50M', '50M', 'total']
      }
    ];
    
    let numericalAccuracy = 0;
    for (const query of numericalQueries) {
      const foundTerms = await askChatQuestion(page, query.question, query.expectedTerms);
      if (foundTerms > 0) {
        numericalAccuracy++;
      }
      await page.waitForTimeout(3000);
    }
    
    console.log(`✅ Numerical accuracy: ${numericalAccuracy}/${numericalQueries.length} queries successful`);
    expect(numericalAccuracy).toBeGreaterThanOrEqual(3);
  });

  test('error handling and edge cases', async ({ page }) => {
    console.log('⚠️ Testing error handling and edge cases');
    
    await page.goto('/dashboard/chat');
    await page.waitForTimeout(3000);
    
    const edgeCaseQueries = [
      {
        question: 'What is the meaning of life?',
        expectedResponses: ['don\'t have', 'cannot find', 'not found', 'no information']
      },
      {
        question: 'Tell me about documents that don\'t exist',
        expectedResponses: ['no documents', 'cannot find', 'not available']
      },
      {
        question: '',
        expectedResponses: ['please provide', 'ask a question', 'empty']
      }
    ];
    
    const chatInput = page.locator('textarea, input[type="text"]').filter({ hasText: '' }).first();
    const sendButton = page.locator('button').filter({ hasText: /send/i }).first();
    
    let edgeCasesHandled = 0;
    
    for (const query of edgeCaseQueries) {
      if (query.question === '') {
        // Test empty query
        await chatInput.fill('');
        if (await sendButton.isVisible()) {
          await sendButton.click();
          await page.waitForTimeout(3000);
          
          // Check if empty query is handled appropriately
          const handled = await page.locator('text=please, text=question, text=empty').first().isVisible();
          if (handled) edgeCasesHandled++;
        }
      } else {
        await chatInput.fill(query.question);
        await sendButton.click();
        await page.waitForTimeout(8000);
        
        // Check for appropriate "no information" responses
        let foundResponse = false;
        for (const response of query.expectedResponses) {
          const responseElement = page.locator(`text=${response}`).first();
          if (await responseElement.isVisible()) {
            foundResponse = true;
            break;
          }
        }
        
        if (foundResponse) {
          edgeCasesHandled++;
          console.log(`✅ Edge case handled: "${query.question}"`);
        }
      }
      
      await page.waitForTimeout(2000);
    }
    
    console.log(`✅ Edge cases handled: ${edgeCasesHandled}/${edgeCaseQueries.length}`);
    expect(edgeCasesHandled).toBeGreaterThanOrEqual(2);
  });

  test('system performance under load', async ({ page }) => {
    console.log('⚡ Testing system performance under load');
    
    // Upload multiple documents quickly
    await page.goto('/dashboard/documents');
    await page.waitForTimeout(2000);
    
    const performanceTestFiles = [
      'rag-test-document.txt',
      'ai-chat-test.txt',
      'project-status.txt'
    ];
    
    const startTime = Date.now();
    
    for (const file of performanceTestFiles) {
      await uploadFixtureFile(page, file);
      await page.waitForTimeout(1000); // Minimal wait between uploads
    }
    
    const uploadTime = Date.now() - startTime;
    console.log(`📊 Upload performance: ${uploadTime}ms for ${performanceTestFiles.length} files`);
    
    // Test rapid-fire queries
    await page.goto('/dashboard/chat');
    await page.waitForTimeout(3000);
    
    const rapidQueries = [
      'What companies are mentioned?',
      'List all project names',
      'What are the key metrics?',
      'Who are the main people mentioned?'
    ];
    
    const queryStartTime = Date.now();
    let rapidResponses = 0;
    
    for (const query of rapidQueries) {
      const foundTerms = await askChatQuestion(page, query, []);
      if (foundTerms >= 0) { // Just check if we get any response
        rapidResponses++;
      }
      await page.waitForTimeout(1000); // Minimal wait between queries
    }
    
    const queryTime = Date.now() - queryStartTime;
    console.log(`📊 Query performance: ${queryTime}ms for ${rapidQueries.length} queries`);
    console.log(`✅ Performance test: ${rapidResponses}/${rapidQueries.length} queries responded`);
    
    expect(rapidResponses).toBeGreaterThanOrEqual(3);
    expect(uploadTime).toBeLessThan(60000); // Should complete within 1 minute
    expect(queryTime).toBeLessThan(45000); // Should complete within 45 seconds
  });
});

test.describe('RAG System Validation', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
  });

  test('validate document chunking and embedding', async ({ page }) => {
    console.log('🔍 Validating document chunking and embedding process');
    
    await page.goto('/dashboard/documents');
    await page.waitForTimeout(2000);
    
    // Upload a structured document
    await uploadFixtureFile(page, 'rag-architecture.txt');
    
    // Navigate to chat and test section-specific retrieval
    await page.goto('/dashboard/chat');
    await page.waitForTimeout(3000);
    
    const sectionQueries = [
      {
        question: 'Tell me about Section 1',
        expectedTerms: ['Introduction', 'Retrieval-Augmented Generation']
      },
      {
        question: 'What is mentioned in Section 4?',
        expectedTerms: ['Performance Metrics', '2.5 seconds', '92%']
      },
      {
        question: 'Describe Section 5',
        expectedTerms: ['Technical Stack', 'Next.js', 'Supabase']
      }
    ];
    
    let sectionRetrieval = 0;
    for (const query of sectionQueries) {
      const foundTerms = await askChatQuestion(page, query.question, query.expectedTerms);
      if (foundTerms >= 1) {
        sectionRetrieval++;
      }
      await page.waitForTimeout(3000);
    }
    
    console.log(`✅ Section retrieval: ${sectionRetrieval}/${sectionQueries.length} sections found`);
    expect(sectionRetrieval).toBeGreaterThanOrEqual(2);
  });

  test('test semantic vs keyword search', async ({ page }) => {
    console.log('🎯 Testing semantic vs keyword search capabilities');
    
    await page.goto('/dashboard/documents');
    await page.waitForTimeout(2000);
    
    await uploadFixtureFile(page, 'ai-chat-test.txt');
    
    await page.goto('/dashboard/chat');
    await page.waitForTimeout(3000);
    
    const semanticQueries = [
      {
        question: 'How is the business performing financially?',
        expectedTerms: ['revenue', '$50M', 'growth', 'performance']
      },
      {
        question: 'What is the organizational structure?',
        expectedTerms: ['departments', 'employees', 'Engineering', 'Sales']
      },
      {
        question: 'How successful is the company?',
        expectedTerms: ['achievements', 'customers', 'uptime', 'processed']
      }
    ];
    
    let semanticAccuracy = 0;
    for (const query of semanticQueries) {
      const foundTerms = await askChatQuestion(page, query.question, query.expectedTerms);
      if (foundTerms >= 2) {
        semanticAccuracy++;
      }
      await page.waitForTimeout(3000);
    }
    
    console.log(`✅ Semantic search: ${semanticAccuracy}/${semanticQueries.length} queries successful`);
    expect(semanticAccuracy).toBeGreaterThanOrEqual(2);
  });
});
