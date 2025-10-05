/**
 * Local test for mammoth DOCX parser
 * 
 * Usage: npx tsx scripts/test-mammoth-docx.ts <path-to-docx>
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import mammoth from 'mammoth';
import { existsSync } from 'fs';

async function testMammoth() {
  const docxPath = process.argv[2];
  
  if (!docxPath) {
    console.error('❌ Usage: npx tsx scripts/test-mammoth-docx.ts <path-to-docx>');
    process.exit(1);
  }
  
  if (!existsSync(docxPath)) {
    console.error(`❌ File not found: ${docxPath}`);
    process.exit(1);
  }
  
  console.log(`\n📄 Testing mammoth DOCX parser`);
  console.log(`📁 File: ${docxPath}\n`);
  
  const startTime = Date.now();
  
  try {
    // Test mammoth
    console.log('🔍 Extracting text with mammoth...');
    const result = await mammoth.extractRawText({ path: docxPath });
    const duration = Date.now() - startTime;
    
    console.log(`✅ SUCCESS in ${duration}ms\n`);
    console.log(`📊 Stats:`);
    console.log(`  - Text length: ${result.value.length} chars`);
    console.log(`  - Lines: ${result.value.split('\n').length}`);
    console.log(`  - Words: ~${result.value.split(/\s+/).length}`);
    
    console.log(`\n📝 Preview (first 500 chars):`);
    console.log('─'.repeat(60));
    console.log(result.value.substring(0, 500));
    console.log('─'.repeat(60));
    
    if (result.messages && result.messages.length > 0) {
      console.log(`\n⚠️ Warnings:`);
      result.messages.forEach(msg => console.log(`  - ${msg.message}`));
    }
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`\n❌ FAILED in ${duration}ms`);
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

testMammoth();

