/**
 * Test OpenRouter Embeddings API
 * Run: node test-openrouter-embeddings.js
 */

require('dotenv').config();

async function testOpenRouterEmbeddings() {
  console.log('🔍 Testing OpenRouter Embeddings API...\n');
  
  // Check env var
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY not set!');
    process.exit(1);
  }
  
  console.log('✅ API Key found:', apiKey.substring(0, 10) + '...');
  console.log('📤 Sending request to OpenRouter...\n');
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'DocsFlow Test',
      },
      body: JSON.stringify({
        model: 'openai/text-embedding-3-small',
        input: 'This is a test sentence.',
      }),
    });
    
    console.log('📥 Response received:');
    console.log('   Status:', response.status, response.statusText);
    console.log('   Headers:', Object.fromEntries(response.headers.entries()));
    console.log('');
    
    const responseText = await response.text();
    console.log('📄 Raw Response (first 500 chars):');
    console.log(responseText.substring(0, 500));
    console.log('');
    
    if (!response.ok) {
      console.error('❌ API Error:', response.status);
      console.error('📄 Full response:', responseText);
      process.exit(1);
    }
    
    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse as JSON!');
      console.error('   Response starts with:', responseText.substring(0, 100));
      console.error('   Parse error:', parseError.message);
      process.exit(1);
    }
    
    console.log('✅ Successfully parsed JSON!');
    console.log('');
    console.log('📊 Response structure:');
    console.log('   Model:', data.model);
    console.log('   Data length:', data.data?.length);
    console.log('   First embedding length:', data.data?.[0]?.embedding?.length);
    console.log('   Usage:', data.usage);
    console.log('');
    
    if (data.data?.[0]?.embedding?.length === 1536) {
      console.log('🎉 SUCCESS! Got 1536-dimensional embedding!');
    } else {
      console.log('⚠️  Warning: Embedding dimension is', data.data?.[0]?.embedding?.length);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testOpenRouterEmbeddings();

