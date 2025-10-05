/**
 * Debug: Check what documents are actually in Pinecone
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { queryVectors } from '../lib/rag/storage/pinecone';
import { generateEmbedding } from '../lib/rag/core/embeddings';

const TENANT_ID = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb';

async function main() {
  console.log('🔍 Checking Pinecone for documents...\n');
  
  // Test query
  const query = "What is the TEST document about?";
  console.log(`Query: "${query}"\n`);
  
  // Generate embedding
  const embedding = await generateEmbedding(query);
  
  // Retrieve chunks (Pinecone uses tenantId as namespace)
  const results = await queryVectors({
    vector: embedding,
    namespace: TENANT_ID, // FIX: Pinecone expects 'namespace', not 'tenantId'
    topK: 10, // Get more results to see what's available
  });
  
  console.log(`Found ${results.length} chunks:\n`);
  
  // Group by filename
  const byFile = results.reduce((acc, r) => {
    const filename = r.metadata.filename || 'Unknown';
    if (!acc[filename]) {
      acc[filename] = [];
    }
    acc[filename].push(r);
    return acc;
  }, {} as Record<string, typeof results>);
  
  Object.entries(byFile).forEach(([filename, chunks]) => {
    console.log(`📄 ${filename}: ${chunks.length} chunks`);
    chunks.forEach((c, i) => {
      console.log(`   ${i + 1}. Score: ${c.score?.toFixed(4)} | ${c.metadata.content?.substring(0, 80)}...`);
    });
    console.log('');
  });
  
  // Now try searching specifically for "TEST"
  console.log('\n🔍 Searching specifically for "TEST.docx"...\n');
  
  const testQuery = "TEST.docx SEO audit content strategy";
  const testEmbedding = await generateEmbedding(testQuery);
  
  const testResults = await queryVectors({
    vector: testEmbedding,
    namespace: TENANT_ID, // FIX: Pinecone expects 'namespace', not 'tenantId'
    topK: 5,
  });
  
  console.log(`Found ${testResults.length} chunks:\n`);
  testResults.forEach((r, i) => {
    console.log(`${i + 1}. ${r.metadata.filename} (score: ${r.score?.toFixed(4)})`);
    console.log(`   ${r.metadata.content?.substring(0, 150)}...\n`);
  });
}

main().catch(console.error);

