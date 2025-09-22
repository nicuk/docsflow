#!/usr/bin/env node

/**
 * 🗑️ MANUAL CLEANUP: Delete all error status documents
 * This will clean up the 3 documents currently stuck in "error" status
 */

import { createClient } from '@supabase/supabase-js';
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

const TENANT_ID = '96bbb531-dbb5-499f-bae9-416a43a87e68'; // test-company

async function cleanupErrorDocuments() {
  console.log('🗑️ MANUAL CLEANUP: Deleting error documents');
  console.log('='.repeat(50));

  // Step 1: Find all error documents
  const { data: errorDocs, error: findError } = await supabase
    .from('documents')
    .select('id, filename, processing_status, created_at')
    .eq('tenant_id', TENANT_ID)
    .in('processing_status', ['error', 'processing']);

  if (findError) {
    console.error('❌ Error finding documents:', findError);
    return;
  }

  if (!errorDocs || errorDocs.length === 0) {
    console.log('✅ No error documents found to clean up');
    return;
  }

  console.log(`📄 Found ${errorDocs.length} documents to delete:`);
  for (const doc of errorDocs) {
    console.log(`   ${doc.filename} (${doc.processing_status}) - ${doc.id}`);
  }

  const documentIds = errorDocs.map(doc => doc.id);

  // Step 2: Delete chunks first (foreign key constraint)
  console.log('\n🧩 Deleting document chunks...');
  const { error: chunksDeleteError } = await supabase
    .from('document_chunks')
    .delete()
    .in('document_id', documentIds);

  if (chunksDeleteError) {
    console.error('❌ Error deleting chunks:', chunksDeleteError);
  } else {
    console.log('✅ Document chunks deleted successfully');
  }

  // Step 3: Delete documents
  console.log('\n📄 Deleting documents...');
  const { error: docsDeleteError } = await supabase
    .from('documents')
    .delete()
    .in('id', documentIds);

  if (docsDeleteError) {
    console.error('❌ Error deleting documents:', docsDeleteError);
    return;
  }

  console.log(`✅ Successfully deleted ${errorDocs.length} error documents`);

  // Step 4: Verify cleanup
  console.log('\n🔍 Verifying cleanup...');
  const { data: remainingDocs, error: verifyError } = await supabase
    .from('documents')
    .select('id, filename, processing_status')
    .eq('tenant_id', TENANT_ID);

  if (verifyError) {
    console.error('❌ Error verifying cleanup:', verifyError);
    return;
  }

  console.log(`📊 Remaining documents: ${remainingDocs.length}`);
  for (const doc of remainingDocs) {
    console.log(`   ${doc.filename} (${doc.processing_status})`);
  }

  if (remainingDocs.length === 1 && remainingDocs[0].processing_status === 'completed') {
    console.log('\n🎉 CLEANUP SUCCESSFUL! Only the completed document remains.');
  }
}

cleanupErrorDocuments().catch(console.error);
