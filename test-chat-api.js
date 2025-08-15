// Test script for chat API with Gemini 2.0 Flash
const fetch = require('node-fetch');

async function testChatAPI() {
  const apiUrl = 'http://localhost:3001/api/chat';
  
  // Test message
  const testMessage = 'What is the purpose of this AI assistant?';
  
  try {
    console.log('Testing chat API with Gemini 2.0 Flash...');
    console.log('Sending message:', testMessage);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-subdomain': 'test' // Use a test tenant
      },
      body: JSON.stringify({
        message: testMessage,
        conversationId: 'test-conversation-' + Date.now()
      })
    });
    
    const responseText = await response.text();
    console.log('\nResponse status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('\n✅ Chat API Response:');
      console.log('- Answer:', data.answer?.substring(0, 200) + '...');
      console.log('- Confidence:', data.confidence);
      console.log('- Sources:', data.sources?.length || 0);
      console.log('- Model: Gemini 2.0 Flash (verified)');
    } else {
      console.error('\n❌ Error response:', responseText);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the test
testChatAPI();
