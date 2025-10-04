/**
 * Test OpenAI Embeddings API (Direct)
 * Run: node test-openai-embeddings.js
 */

require('dotenv').config();

async function testOpenAIEmbeddings() {
  console.log('🔍 Testing OpenAI Embeddings API (Direct)...\n');
  
  // Check env var
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not set!');
    console.log('\n💡 Set your OpenAI API key in .env.local:');
    console.log('   OPENAI_API_KEY=sk-...');
    process.exit(1);
  }
  
  console.log('✅ API Key found:', apiKey.substring(0, 10) + '...');
  console.log('📤 Sending request to OpenAI...\n');
  
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: 'This is a test sentence.',
      }),
    });
    
    console.log('📥 Response received:');
    console.log('   Status:', response.status, response.statusText);
    console.log('');
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status);
      console.error('📄 Response:', errorText.substring(0, 500));
      process.exit(1);
    }
    
    const data = await response.json();
    
    console.log('✅ Successfully got response!');
    console.log('');
    console.log('📊 Response structure:');
    console.log('   Model:', data.model);
    console.log('   Data length:', data.data?.length);
    console.log('   First embedding length:', data.data?.[0]?.embedding?.length);
    console.log('   Usage:', data.usage);
    console.log('');
    
    if (data.data?.[0]?.embedding?.length === 1536) {
      console.log('🎉 SUCCESS! Got 1536-dimensional embedding!');
      console.log('✅ OpenAI embeddings working perfectly!');
    } else {
      console.log('⚠️  Warning: Embedding dimension is', data.data?.[0]?.embedding?.length);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testOpenAIEmbeddings();

