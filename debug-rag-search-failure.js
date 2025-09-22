#!/usr/bin/env node

/**
 * 🔍 DEBUG RAG SEARCH FAILURE
 * Trace exactly why RAG can't find simple terms like "revenue", "TechCorp", "$2.5 million"
 * in a business report and always abstains
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TENANT_ID = '96bbb531-dbb5-499f-bae9-416a43a87e68';
const BASE_URL = 'https://test-company.docsflow.app';

// Get the latest test document we created
async function getTestDocument() {
  console.log('📄 Step 1: Finding the test business report document...');
  
  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, filename, processing_status, created_at')
    .eq('tenant_id', TENANT_ID)
    .ilike('filename', '%business-report%')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (error || !docs || docs.length === 0) {
    console.log('❌ No test document found - need to create one first');
    return null;
  }
  
  const doc = docs[0];
  console.log(`✅ Found test document: ${doc.filename}`);
  console.log(`   ID: ${doc.id}`);
  console.log(`   Status: ${doc.processing_status}`);
  console.log(`   Created: ${doc.created_at}`);
  
  return doc;
}

// Analyze the chunks we created
async function analyzeDocumentChunks(documentId) {
  console.log('\n📦 Step 2: Analyzing document chunks...');
  
  const { data: chunks, error } = await supabase
    .from('document_chunks')
    .select('id, chunk_index, content, metadata, tenant_id')
    .eq('document_id', documentId)
    .eq('tenant_id', TENANT_ID)
    .order('chunk_index');
  
  if (error) {
    console.error('❌ Error fetching chunks:', error.message);
    return [];
  }
  
  console.log(`✅ Found ${chunks.length} chunks for document`);
  
  chunks.forEach((chunk, i) => {
    console.log(`\n📝 Chunk ${i + 1} (Index: ${chunk.chunk_index}):`);
    console.log(`   Length: ${chunk.content.length} characters`);
    console.log(`   Content preview: ${chunk.content.substring(0, 150)}...`);
    
    // Check for specific terms
    const testTerms = ['revenue', 'TechCorp', '2.5 million', '$2.5', 'Q4 2024', 'million'];
    const foundTerms = testTerms.filter(term => 
      chunk.content.toLowerCase().includes(term.toLowerCase())
    );
    
    if (foundTerms.length > 0) {
      console.log(`   🎯 Contains terms: ${foundTerms.join(', ')}`);
    } else {
      console.log(`   ❌ No test terms found`);
    }
  });
  
  return chunks;
}

// Test direct database searches that RAG should be doing
async function testDirectSearch() {
  console.log('\n🔍 Step 3: Testing direct database searches...');
  
  const searchTerms = [
    'revenue',
    '2.5',
    'million', 
    'TechCorp',
    'Q4',
    '2024',
    'software',
    'consulting'
  ];
  
  const searchResults = {};
  
  for (const term of searchTerms) {
    console.log(`\n🔍 Testing search for: "${term}"`);
    
    // Test exact search that RAG hybrid reranker uses
    const { data: results, error } = await supabase
      .from('document_chunks')
      .select('id, content, document_id')
      .eq('tenant_id', TENANT_ID)
      .ilike('content', `%${term}%`);
    
    if (error) {
      console.log(`   ❌ DB Error: ${error.message}`);
      searchResults[term] = { error: error.message, count: 0 };
    } else {
      console.log(`   📊 Found ${results.length} chunks containing "${term}"`);
      if (results.length > 0) {
        console.log(`   ✅ Sample match: ${results[0].content.substring(0, 100)}...`);
      }
      searchResults[term] = { count: results.length, error: null };
    }
  }
  
  return searchResults;
}

// Test the RAG pipeline step by step
async function testRAGPipelineSteps(authToken) {
  console.log('\n🎯 Step 4: Testing RAG Pipeline Components...');
  
  // Test 1: Simple query
  console.log('\n🔍 Test 1: Simple Revenue Query');
  await testSingleQuery(authToken, 'What was the revenue?', 'revenue');
  
  // Test 2: Specific client query  
  console.log('\n🔍 Test 2: Client Information Query');
  await testSingleQuery(authToken, 'Tell me about TechCorp', 'TechCorp');
  
  // Test 3: Financial query
  console.log('\n🔍 Test 3: Financial Amount Query');
  await testSingleQuery(authToken, 'What is 2.5 million?', '2.5');
  
  // Test 4: Generic business query
  console.log('\n🔍 Test 4: Generic Business Query');
  await testSingleQuery(authToken, 'business report summary', 'report');
}

async function testSingleQuery(authToken, query, expectedTerm) {
  console.log(`   Query: "${query}"`);
  console.log(`   Expected to find: "${expectedTerm}"`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'X-Tenant-ID': TENANT_ID,
        'X-Tenant-Subdomain': 'test-company'
      },
      body: JSON.stringify({
        message: query,
        conversationId: null
      })
    });

    const data = await response.json();
    
    console.log(`   📡 Status: ${response.status}`);
    console.log(`   📊 Sources Found: ${data.sources?.length || 0}`);
    console.log(`   🎲 Confidence: ${data.confidence}`);
    console.log(`   🔧 Strategy: ${data.metadata?.strategy || 'unknown'}`);
    console.log(`   🛡️ Fallback Used: ${data.metadata?.fallback_used || false}`);
    
    // Check if response contains expected term
    const responseText = data.response?.toLowerCase() || '';
    const containsExpected = responseText.includes(expectedTerm.toLowerCase());
    
    console.log(`   🎯 Contains "${expectedTerm}": ${containsExpected ? '✅ YES' : '❌ NO'}`);
    console.log(`   📝 Response: ${data.response?.substring(0, 100)}...`);
    
    // If sources were found, check their content
    if (data.sources && data.sources.length > 0) {
      console.log(`   📄 Source Content Check:`);
      data.sources.forEach((source, i) => {
        const sourceContainsTerm = source.content?.toLowerCase().includes(expectedTerm.toLowerCase());
        console.log(`     Source ${i + 1}: ${sourceContainsTerm ? '✅' : '❌'} contains "${expectedTerm}"`);
      });
    }
    
    return {
      query,
      expectedTerm,
      sourcesFound: data.sources?.length || 0,
      confidence: data.confidence,
      strategy: data.metadata?.strategy,
      fallbackUsed: data.metadata?.fallback_used,
      containsExpected,
      response: data.response
    };
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { query, error: error.message };
  }
}

// Get auth token
async function getAuthToken() {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': TENANT_ID,
      'X-Tenant-Subdomain': 'test-company'
    },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'Testing123?'
    })
  });

  const data = await response.json();
  return data.session?.access_token;
}

// Main debugging function
async function debugRAGSearchFailure() {
  console.log('🔍 DEBUG RAG SEARCH FAILURE');
  console.log('='.repeat(60));
  console.log('🎯 Goal: Find why RAG can\'t search simple business terms');
  console.log('='.repeat(60));

  try {
    // Step 1: Find test document
    const testDoc = await getTestDocument();
    if (!testDoc) {
      console.log('🚨 No test document found - run content understanding test first');
      return;
    }

    // Step 2: Analyze chunks
    const chunks = await analyzeDocumentChunks(testDoc.id);
    if (chunks.length === 0) {
      console.log('🚨 No chunks found for test document');
      return;
    }

    // Step 3: Test direct database searches
    const searchResults = await testDirectSearch();

    // Step 4: Get auth token and test RAG pipeline
    console.log('\n🔐 Getting auth token...');
    const authToken = await getAuthToken();
    if (!authToken) {
      console.log('🚨 Failed to get auth token');
      return;
    }

    await testRAGPipelineSteps(authToken);

    // Final Analysis
    console.log('\n📊 RAG SEARCH FAILURE ANALYSIS');
    console.log('='.repeat(60));

    // Analyze search results
    const successfulSearches = Object.entries(searchResults).filter(([term, result]) => 
      result.count > 0 && !result.error
    );
    const failedSearches = Object.entries(searchResults).filter(([term, result]) => 
      result.count === 0 || result.error
    );

    console.log(`✅ Database searches successful: ${successfulSearches.length}/${Object.keys(searchResults).length}`);
    console.log(`❌ Database searches failed: ${failedSearches.length}/${Object.keys(searchResults).length}`);

    if (successfulSearches.length > 0) {
      console.log(`\n✅ TERMS FOUND IN DATABASE:`);
      successfulSearches.forEach(([term, result]) => {
        console.log(`   "${term}": ${result.count} chunks`);
      });
    }

    if (failedSearches.length > 0) {
      console.log(`\n❌ TERMS NOT FOUND IN DATABASE:`);
      failedSearches.forEach(([term, result]) => {
        console.log(`   "${term}": ${result.error || 'No matches'}`);
      });
    }

    console.log('\n🎯 ROOT CAUSE DIAGNOSIS:');
    
    if (chunks.length === 0) {
      console.log('🚨 ISSUE: No document chunks created during processing');
    } else if (failedSearches.length === Object.keys(searchResults).length) {
      console.log('🚨 ISSUE: Document chunks exist but contain no searchable business terms');
      console.log('   → Content chunking may have corrupted the text');
      console.log('   → Need to inspect actual chunk content vs original document');
    } else if (successfulSearches.length > 0) {
      console.log('✅ DATABASE SEARCH WORKING: Terms found in chunks');
      console.log('🚨 ISSUE: RAG pipeline not using database search correctly');
      console.log('   → RAG abstaining even when database has matches');
      console.log('   → Need to debug RAG confidence/scoring logic');
    }

  } catch (error) {
    console.error('🚨 Debug failed:', error.message);
  }
}

debugRAGSearchFailure().catch(console.error);
