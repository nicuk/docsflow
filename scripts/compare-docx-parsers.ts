/**
 * Compare DocxLoader vs Mammoth locally
 * 
 * Usage: npx tsx scripts/compare-docx-parsers.ts <path-to-docx>
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import mammoth from 'mammoth';
import { existsSync } from 'fs';

async function compareDocxParsers() {
  const docxPath = process.argv[2];
  
  if (!docxPath) {
    console.error('❌ Usage: npx tsx scripts/compare-docx-parsers.ts <path-to-docx>');
    process.exit(1);
  }
  
  if (!existsSync(docxPath)) {
    console.error(`❌ File not found: ${docxPath}`);
    process.exit(1);
  }
  
  console.log(`\n📄 Comparing DOCX parsers`);
  console.log(`📁 File: ${docxPath}\n`);
  console.log('='.repeat(70));
  
  // Test 1: DocxLoader (LangChain)
  console.log('\n📦 TEST 1: DocxLoader (@langchain/community)');
  console.log('-'.repeat(70));
  
  try {
    const startTime1 = Date.now();
    const { DocxLoader } = await import('@langchain/community/document_loaders/fs/docx');
    const loader = new DocxLoader(docxPath);
    const docs = await loader.load();
    const duration1 = Date.now() - startTime1;
    
    if (!docs || docs.length === 0 || !docs[0].pageContent) {
      throw new Error('DocxLoader returned empty content');
    }
    
    console.log(`✅ SUCCESS in ${duration1}ms`);
    console.log(`\n📊 Stats:`);
    console.log(`  - Documents: ${docs.length}`);
    console.log(`  - Text length: ${docs[0].pageContent.length} chars`);
    console.log(`  - Lines: ${docs[0].pageContent.split('\n').length}`);
    console.log(`  - Words: ~${docs[0].pageContent.split(/\s+/).length}`);
    
    console.log(`\n📝 Preview (first 500 chars):`);
    console.log('─'.repeat(60));
    console.log(docs[0].pageContent.substring(0, 500));
    console.log('─'.repeat(60));
    
    // Check for binary garbage
    const hasBinaryGarbage = /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(docs[0].pageContent.substring(0, 100));
    if (hasBinaryGarbage) {
      console.log('\n🚨 WARNING: Binary garbage detected in output!');
    }
    
  } catch (error: any) {
    console.error(`\n❌ FAILED`);
    console.error(`Error: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
  }
  
  // Test 2: Mammoth
  console.log('\n\n📦 TEST 2: Mammoth (industry standard)');
  console.log('-'.repeat(70));
  
  try {
    const startTime2 = Date.now();
    const result = await mammoth.extractRawText({ path: docxPath });
    const duration2 = Date.now() - startTime2;
    
    if (!result.value || result.value.length < 10) {
      throw new Error('Mammoth returned empty or too-short content');
    }
    
    console.log(`✅ SUCCESS in ${duration2}ms`);
    console.log(`\n📊 Stats:`);
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
    console.error(`\n❌ FAILED`);
    console.error(`Error: ${error.message}`);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('🏁 Comparison complete!\n');
}

compareDocxParsers();

