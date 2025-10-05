/**
 * Delete ALL vectors in a Pinecone namespace
 * NUCLEAR OPTION - Use with caution!
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { Pinecone } from '@pinecone-database/pinecone';

const TENANT_ID = 'b89b8fab-0a25-4266-a4d0-306cc4d358cb'; // sculptai

async function deleteNamespace() {
  console.log('\n🗑️  DELETING ALL PINECONE VECTORS');
  console.log(`Namespace: ${TENANT_ID}\n`);
  console.log('⚠️  WARNING: This will delete ALL vectors for this tenant!');
  console.log('Press Ctrl+C within 3 seconds to cancel...\n');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    
    const index = pinecone.index('emerald-oak');
    
    console.log('🔥 Deleting namespace...');
    await index.namespace(TENANT_ID).deleteAll();
    
    console.log('✅ SUCCESS! All vectors deleted.');
    console.log('\nVerify at: https://app.pinecone.io/organizations/-/projects/-/indexes/emerald-oak/browser\n');
    
  } catch (error: any) {
    console.error('❌ FAILED:', error.message);
    process.exit(1);
  }
}

deleteNamespace();

