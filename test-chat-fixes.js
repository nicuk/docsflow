const https = require('https');

// Test configuration
const API_URL = 'https://docsflowbitto.vercel.app/api/chat';
const TEST_MESSAGE = 'What is the revenue forecast for Q3?';

async function testChatAPI() {
  console.log('🧪 Testing Chat API with fixes...\n');
  
  const requestData = JSON.stringify({
    message: TEST_MESSAGE,
    conversationId: 'test-' + Date.now(),
    tenantId: '3a8e6b30-d88f-4b31-b21f-84c05a7837f0' // Bitto tenant ID
  });

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': requestData.length,
      'Origin': 'https://docsflowbitto.vercel.app'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(API_URL, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('📊 Response Status:', res.statusCode);
        console.log('📋 Response Headers:', res.headers);
        console.log('\n📝 Response Body:');
        
        try {
          const parsed = JSON.parse(data);
          console.log(JSON.stringify(parsed, null, 2));
          
          if (res.statusCode === 200) {
            console.log('\n✅ Chat API is working!');
            console.log('📌 AI Response:', parsed.response);
            console.log('📊 Confidence:', parsed.confidence);
            console.log('📚 Sources:', parsed.sources?.length || 0);
          } else {
            console.log('\n❌ Error Response:', parsed.error);
            console.log('📝 Details:', parsed.details);
          }
        } catch (e) {
          console.log('Raw response:', data);
          console.log('\n⚠️ Failed to parse response as JSON');
        }
        
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
      reject(error);
    });
    
    req.write(requestData);
    req.end();
  });
}

// Run the test
console.log('========================================');
console.log('🚀 CHAT API FIX VERIFICATION TEST');
console.log('========================================\n');
console.log('Testing with message:', TEST_MESSAGE);
console.log('Target URL:', API_URL);
console.log('\n----------------------------------------\n');

testChatAPI()
  .then(() => {
    console.log('\n========================================');
    console.log('✅ Test completed successfully');
    console.log('========================================');
  })
  .catch((error) => {
    console.log('\n========================================');
    console.log('❌ Test failed with error:', error.message);
    console.log('========================================');
    process.exit(1);
  });
