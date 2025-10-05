/**
 * Test OpenRouter Gemini Vision API speed locally
 * Compare actual latency vs Vercel production
 * 
 * Usage: npx tsx scripts/test-openrouter-vision-speed.ts <path-to-image>
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { readFileSync, existsSync } from 'fs';

async function testVisionAPI(imagePath: string) {
  if (!imagePath || !existsSync(imagePath)) {
    console.error('❌ Usage: npx tsx scripts/test-openrouter-vision-speed.ts <path-to-image>');
    process.exit(1);
  }
  
  console.log('\n🔬 TESTING OPENROUTER GEMINI VISION SPEED\n');
  console.log('='.repeat(70));
  
  // Read and convert image to base64
  console.log(`📁 Reading image: ${imagePath}`);
  const imageBuffer = readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const imageSizeKB = (imageBuffer.length / 1024).toFixed(2);
  
  console.log(`📏 Image size: ${imageSizeKB} KB`);
  console.log(`📏 Base64 size: ${base64Image.length} chars\n`);
  
  const models = [
    'google/gemini-2.0-flash-001',
    'google/gemini-pro-vision',
    'openai/gpt-4o-mini',
  ];
  
  for (const model of models) {
    console.log('─'.repeat(70));
    console.log(`\n🧪 Testing: ${model}\n`);
    
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
    
    const startTime = Date.now();
    
    try {
      // Add 120s timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
        console.error('⏱️  TIMEOUT after 120 seconds');
      }, 120000);
      
      console.log(`🌐 Calling OpenRouter API...`);
      const requestStart = Date.now();
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        },
        body: JSON.stringify({
          model,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: visionPrompt },
              { 
                type: 'image_url', 
                image_url: { 
                  url: `data:image/png;base64,${base64Image}` 
                } 
              }
            ]
          }],
        }),
      });
      
      clearTimeout(timeout);
      const networkDuration = Date.now() - requestStart;
      
      console.log(`📨 Response status: ${response.status}`);
      console.log(`⏱️  Network time: ${networkDuration}ms`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error: ${errorText}\n`);
        continue;
      }
      
      const result = await response.json();
      const totalDuration = Date.now() - startTime;
      
      const extractedText = result.choices?.[0]?.message?.content || '';
      
      console.log(`✅ SUCCESS`);
      console.log(`⏱️  Total time: ${totalDuration}ms (${(totalDuration / 1000).toFixed(1)}s)`);
      console.log(`📏 Extracted text length: ${extractedText.length} chars`);
      
      // Show usage/cost if available
      if (result.usage) {
        console.log(`💰 Usage:`, result.usage);
      }
      
      console.log(`\n📝 Preview (first 200 chars):`);
      console.log('─'.repeat(60));
      console.log(extractedText.substring(0, 200) + (extractedText.length > 200 ? '...' : ''));
      console.log('─'.repeat(60));
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      if (error.name === 'AbortError') {
        console.error(`❌ TIMEOUT after ${duration}ms`);
      } else {
        console.error(`❌ ERROR after ${duration}ms: ${error.message}`);
      }
    }
    
    console.log('\n');
  }
  
  console.log('='.repeat(70));
  console.log('\n🏁 Speed Test Complete!\n');
}

// Get image path from command line
const imagePath = process.argv[2];
testVisionAPI(imagePath);

