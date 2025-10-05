/**
 * Test Gemini 2.0 Flash Vision via OpenRouter
 * 
 * This test simulates the exact flow used in production for image OCR
 * to verify Gemini Vision is working correctly before deployment.
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import * as fs from 'fs';
import * as path from 'path';

async function testGeminiVision() {
  console.log('🧪 Testing Gemini 2.0 Flash Vision via OpenRouter...\n');
  
  // Check if OpenRouter API key is set
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY not found in .env.local');
    process.exit(1);
  }
  
  console.log('✅ OpenRouter API key found\n');
  
  // For this test, we'll create a simple test image with text
  // In real scenario, you'd provide a path to an actual image
  const testImagePath = process.argv[2];
  
  if (!testImagePath) {
    console.log('📝 Usage: npx tsx scripts/test-gemini-vision.ts <path-to-image>');
    console.log('Example: npx tsx scripts/test-gemini-vision.ts ./test-image.png');
    console.log('\n💡 Tip: Download a test image with text and provide its path');
    process.exit(1);
  }
  
  if (!fs.existsSync(testImagePath)) {
    console.error(`❌ Image not found: ${testImagePath}`);
    process.exit(1);
  }
  
  // Read image and convert to base64
  console.log(`📁 Reading image: ${testImagePath}`);
  const imageBuffer = fs.readFileSync(testImagePath);
  const base64Image = imageBuffer.toString('base64');
  
  // Determine mime type from extension
  const ext = path.extname(testImagePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif'
  };
  const mimeType = mimeTypes[ext] || 'image/png';
  
  console.log(`📏 Image size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
  console.log(`📝 MIME type: ${mimeType}`);
  console.log(`🔢 Base64 length: ${base64Image.length} chars\n`);
  
  // Call Gemini Vision via OpenRouter (exact same code as production)
  const visionPrompt = `Extract ALL text, numbers, and data from this image. Return ONLY the actual content visible in the image.

Rules:
- DO NOT add descriptions like "This image shows..." or "The document contains..."
- DO NOT add interpretations or summaries
- ONLY transcribe the exact text/data you see
- If there's a title, include it
- If there are bullet points, list them
- If there are tables/charts, extract the data
- If it's purely visual with no text, describe ONLY the key elements

Return raw content only.`;

  console.log('🌐 Calling OpenRouter Gemini Vision API...');
  const startTime = Date.now();
  
  try {
    const visionResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://docsflow.app',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free', // Paid version available if needed
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: visionPrompt },
            { 
              type: 'image_url', 
              image_url: { 
                url: `data:${mimeType};base64,${base64Image}` 
              } 
            }
          ]
        }],
      }),
    });
    
    const duration = Date.now() - startTime;
    console.log(`⏱️  API call completed in ${duration}ms\n`);
    
    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error('❌ Vision API error response:');
      console.error(errorText);
      process.exit(1);
    }
    
    const visionResult = await visionResponse.json();
    let extractedText = visionResult.choices?.[0]?.message?.content || '';
    
    if (!extractedText || extractedText.length < 10) {
      console.error('❌ No text extracted from image (or too short)');
      console.error('Response:', JSON.stringify(visionResult, null, 2));
      process.exit(1);
    }
    
    // Clean output for RAG (same as production)
    extractedText = extractedText
      .replace(/^(Here is the|This image|The document|I can see|Extracted text:)\s*/gi, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/^[*•-]\s+/gm, '')
      .trim();
    
    console.log('✅ SUCCESS! Text extracted from image:\n');
    console.log('═'.repeat(80));
    console.log(extractedText);
    console.log('═'.repeat(80));
    console.log(`\n📊 Stats:`);
    console.log(`  - API call duration: ${duration}ms`);
    console.log(`  - Extracted text length: ${extractedText.length} chars`);
    console.log(`  - Lines: ${extractedText.split('\n').length}`);
    console.log(`  - Model: google/gemini-2.0-flash-exp:free`);
    
    // Check for common issues
    const issues = [];
    if (extractedText.toLowerCase().includes('i don\'t have')) {
      issues.push('⚠️  LLM abstained from extracting');
    }
    if (extractedText.includes('```')) {
      issues.push('⚠️  Contains code blocks (might need cleaning)');
    }
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(extractedText)) {
      issues.push('🚨 Contains binary/control characters (GARBAGE!)');
    }
    
    if (issues.length > 0) {
      console.log('\n⚠️  Potential Issues:');
      issues.forEach(issue => console.log(`  ${issue}`));
    } else {
      console.log('\n✅ No issues detected - Output looks clean!');
    }
    
    console.log('\n🎯 Test completed successfully!');
    console.log('👍 Gemini Vision is working correctly via OpenRouter');
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testGeminiVision().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

