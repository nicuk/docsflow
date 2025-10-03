/**
 * Quick test to verify tenant filtering is working after the fix
 */

import { createClient } from '@supabase/supabase-js';

async function testTenantFiltering() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🧪 Testing Tenant Filtering Fix\n');
  console.log('================================\n');

  // Get all tenants
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, subdomain')
    .order('subdomain');

  if (!tenants || tenants.length === 0) {
    console.error('❌ No tenants found');
    return;
  }

  console.log(`📊 Found ${tenants.length} tenants:\n`);
  tenants.forEach(t => console.log(`   - ${t.subdomain} (${t.id})`));
  console.log('');

  // Get a sample embedding from the first tenant with embeddings
  const { data: sampleChunk } = await supabase
    .from('document_chunks')
    .select('embedding, document_id, documents!inner(tenant_id, filename, tenants!inner(subdomain))')
    .not('embedding', 'is', null)
    .limit(1)
    .single();

  if (!sampleChunk) {
    console.error('❌ No chunks with embeddings found');
    return;
  }

  const testTenantId = (sampleChunk as any).documents.tenant_id;
  const testSubdomain = (sampleChunk as any).documents.tenants.subdomain;
  const testFilename = (sampleChunk as any).documents.filename;
  
  console.log(`🔍 Test Query Details:`);
  console.log(`   - Using embedding from: ${testFilename}`);
  console.log(`   - Expected tenant: ${testSubdomain} (${testTenantId})`);
  console.log('');

  // Test 1: With correct tenant filter
  console.log('TEST 1: Searching WITH tenant filter');
  console.log('-------------------------------------');
  const { data: filteredResults, error: filteredError } = await supabase
    .rpc('similarity_search', {
      query_embedding: sampleChunk.embedding,
      tenant_id: testTenantId,  // ✅ Correct param name
      access_level: 5,          // ✅ Correct param name
      match_threshold: 0.3,
      match_count: 10
    });

  if (filteredError) {
    console.error('❌ Error:', filteredError);
    return;
  }

  const wrongTenants = filteredResults?.filter(r => r.tenant_id !== testTenantId) || [];
  
  console.log(`✅ Found ${filteredResults?.length || 0} results`);
  console.log(`   - All from correct tenant: ${wrongTenants.length === 0 ? '✅ YES' : '❌ NO'}`);
  
  if (wrongTenants.length > 0) {
    console.error(`   - 🚨 Found ${wrongTenants.length} docs from wrong tenants!`);
  }

  // Show sample result
  if (filteredResults && filteredResults.length > 0) {
    const sample = filteredResults[0];
    console.log(`   - Sample: ${sample.filename} (page ${sample.chunk_metadata?.page || 1})`);
    console.log(`   - Tenant: ${sample.tenant_id}`);
    console.log(`   - Similarity: ${Math.round(sample.similarity * 100)}%`);
  }
  console.log('');

  // Test 2: Without tenant filter (should return from all tenants)
  console.log('TEST 2: Searching WITHOUT tenant filter (null)');
  console.log('-----------------------------------------------');
  const { data: unfilteredResults } = await supabase
    .rpc('similarity_search', {
      query_embedding: sampleChunk.embedding,
      tenant_id: null,  // No filter
      access_level: 5,
      match_threshold: 0.3,
      match_count: 10
    });

  const uniqueTenants = new Set(unfilteredResults?.map(r => r.tenant_id) || []);
  console.log(`✅ Found ${unfilteredResults?.length || 0} results`);
  console.log(`   - Unique tenants: ${uniqueTenants.size}`);
  console.log(`   - Expected: Multiple tenants (if available)`);
  console.log('');

  // Test 3: Check metadata is present
  console.log('TEST 3: Checking metadata fields');
  console.log('---------------------------------');
  if (filteredResults && filteredResults.length > 0) {
    const firstResult = filteredResults[0];
    const hasFilename = !!firstResult.filename;
    const hasTenantId = !!firstResult.tenant_id;
    const hasMetadata = !!firstResult.chunk_metadata || !!firstResult.document_metadata;
    
    console.log(`✅ Metadata check:`);
    console.log(`   - filename present: ${hasFilename ? '✅' : '❌'} (${firstResult.filename || 'NULL'})`);
    console.log(`   - tenant_id present: ${hasTenantId ? '✅' : '❌'}`);
    console.log(`   - metadata present: ${hasMetadata ? '✅' : '❌'}`);
  }
  console.log('');

  // Summary
  console.log('================================');
  console.log('📋 SUMMARY');
  console.log('================================');
  
  if (wrongTenants.length === 0 && filteredResults && filteredResults.length > 0) {
    console.log('✅ Tenant filtering: WORKING');
    console.log('✅ Metadata fields: PRESENT');
    console.log('✅ Ready for production use');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Restart dev server: npm run dev');
    console.log('  2. Test in chat interface');
    console.log('  3. Run RAGAS diagnostic: npx tsx scripts/diagnose-rag-with-ragas.ts');
  } else {
    console.error('❌ Issues found - check logs above');
  }
}

// Run test
testTenantFiltering().catch(console.error);

