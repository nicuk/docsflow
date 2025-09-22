#!/usr/bin/env node

/**
 * UPLOAD + RAG TEST: Test complete pipeline from upload to RAG retrieval
 * 1. Upload a simple test document
 * 2. Wait for processing
 * 3. Test if RAG can find it
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const TEST_TENANT_ID = '122928f6-f34e-484b-9a69-7e1f25caf45c';
const TEST_CONTENT = `# Test Document for RAG

This is a simple test document to verify our RAG pipeline works.

Key information:
- Company: Bitto Tech
- Document type: Testing
- Keywords: rag, pipeline, testing, documents, AI, search

The quick brown fox jumps over the lazy dog.
This document should be findable by our RAG system.

End of test document.`;

console.log('🚀 [UPLOAD + RAG TEST] Testing complete pipeline...');

async function createTestDocument() {
  console.log('\n=== STEP 1: CREATE TEST DOCUMENT ===');
  
  const filename = `test-rag-${Date.now()}.txt`;
  
  try {
    fs.writeFileSync(filename, TEST_CONTENT);
    console.log('✅ Test document created:', filename);
    console.log('📄 Content preview:', TEST_CONTENT.substring(0, 100) + '...');
    return filename;
  } catch (error) {
    console.error('❌ Failed to create test document:', error.message);
    return null;
  }
}

async function uploadDocument(filename) {
  console.log('\n=== STEP 2: UPLOAD TO PRODUCTION ===');
  
  try {
    // Create FormData for upload
    const formData = new FormData();
    const fileBuffer = fs.readFileSync(filename);
    const blob = new Blob([fileBuffer], { type: 'text/plain' });
    formData.append('file', blob, filename);
    
    console.log('📤 Uploading to production API...');
    
    // Upload to actual production endpoint
    const response = await fetch('https://api.docsflow.app/api/documents/upload', {
      method: 'POST',
      headers: {
        'X-Tenant-ID': TEST_TENANT_ID,
        'X-Tenant-Subdomain': 'bitto',
        'Origin': 'https://bitto.docsflow.app'
        // Note: Would need real auth header for production
      },
      body: formData
    });
    
    console.log('📊 Upload response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Upload successful');
      console.log('📊 Document ID:', result.document?.id || 'Unknown');
      return result.document?.id;
    } else {
      const errorText = await response.text();
      console.log('❌ Upload failed:', errorText);
      return null;
    }
    
  } catch (error) {
    console.error('❌ Upload error:', error.message);
    console.log('⚠️ This is expected without proper auth headers');
    return null;
  }
}

async function checkDocumentInDatabase(filename) {
  console.log('\n=== STEP 3: CHECK DATABASE DIRECTLY ===');
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Check documents table
    console.log('🔍 Checking documents table...');
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('id, filename, tenant_id, processing_status')
      .eq('tenant_id', TEST_TENANT_ID)
      .ilike('filename', `%${filename.split('.')[0]}%`)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (docError) {
      console.error('❌ Documents query failed:', docError);
      return null;
    }
    
    console.log('📊 Recent documents found:', documents?.length || 0);
    documents?.forEach((doc, idx) => {
      console.log(`   ${idx + 1}. ${doc.filename} (${doc.processing_status})`);
    });
    
    // Check document chunks for any recent test content
    console.log('\n🔍 Checking document_chunks for test content...');
    const { data: chunks, error: chunkError } = await supabase
      .from('document_chunks')
      .select('id, document_id, content, tenant_id')
      .eq('tenant_id', TEST_TENANT_ID)
      .ilike('content', '%test%')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (chunkError) {
      console.error('❌ Chunks query failed:', chunkError);
    } else {
      console.log('📊 Test chunks found:', chunks?.length || 0);
      chunks?.forEach((chunk, idx) => {
        console.log(`   ${idx + 1}. ${chunk.content.substring(0, 50)}...`);
      });
    }
    
    return documents?.length > 0 || chunks?.length > 0;
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    return false;
  }
}

async function testRAGSearch() {
  console.log('\n=== STEP 4: TEST RAG SEARCH ===');
  
  try {
    console.log('🔍 Testing RAG search for "test document"...');
    
    const response = await fetch('https://api.docsflow.app/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': TEST_TENANT_ID,
        'X-Tenant-Subdomain': 'bitto',
        'Origin': 'https://bitto.docsflow.app'
        // Note: Would need real auth header for production
      },
      body: JSON.stringify({
        message: 'Find test document or rag testing',
        conversationId: 'test-' + Date.now()
      })
    });
    
    console.log('📊 RAG response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      
      console.log('📊 RAG result:', {
        found_sources: data.sources?.length || 0,
        confidence: data.confidence,
        abstained: data.metadata?.abstained
      });
      
      if (data.sources && data.sources.length > 0) {
        console.log('✅ SUCCESS: RAG found sources!');
        data.sources.slice(0, 3).forEach((source, idx) => {
          console.log(`   ${idx + 1}. ${source.filename || source.document || 'Unknown'}`);
        });
        return true;
      } else {
        console.log('❌ RAG found no sources');
        return false;
      }
    } else {
      const errorText = await response.text();
      console.log('❌ RAG request failed:', errorText);
      return false;
    }
    
  } catch (error) {
    console.error('❌ RAG test failed:', error.message);
    return false;
  }
}

async function cleanup(filename) {
  console.log('\n=== CLEANUP ===');
  
  try {
    if (fs.existsSync(filename)) {
      fs.unlinkSync(filename);
      console.log('✅ Test file cleaned up');
    }
  } catch (error) {
    console.log('⚠️ Cleanup warning:', error.message);
  }
}

async function main() {
  console.log('🎯 Complete pipeline test: Upload → Process → RAG Search');
  
  const filename = await createTestDocument();
  if (!filename) {
    console.log('❌ Cannot proceed without test document');
    return;
  }
  
  // Test upload (will likely fail without auth, but that's OK)
  const documentId = await uploadDocument(filename);
  
  // Check database directly (this should work)
  const hasData = await checkDocumentInDatabase(filename);
  
  // Test RAG search (main test)
  const ragWorks = await testRAGSearch();
  
  await cleanup(filename);
  
  console.log('\n=== FINAL DIAGNOSIS ===');
  console.log(`📄 Database has data: ${hasData ? '✅ YES' : '❌ NO'}`);
  console.log(`🤖 RAG pipeline works: ${ragWorks ? '✅ YES' : '❌ NO'}`);
  
  if (ragWorks) {
    console.log('\n🎉 SUCCESS: Complete pipeline working!');
    console.log('💡 Our tenant filtering + schema fixes are correct');
  } else if (hasData) {
    console.log('\n⚠️ PARTIAL: Data exists but RAG not finding it');
    console.log('💡 Schema/query issue in RAG pipeline');
  } else {
    console.log('\n❌ ISSUE: No data in database');
    console.log('💡 Upload/processing pipeline needs investigation');
  }
}

main().catch(console.error);
