/**
 * TEST SPECIFIC API ENDPOINTS
 * Check which ones are returning 500 errors
 */

async function testAPIEndpoints() {
  console.log('🔍 TESTING API ENDPOINTS');
  console.log('========================');
  
  const baseUrl = 'http://localhost:3000';
  const endpoints = [
    '/api/auth/session',
    '/api/conversations',
    '/api/documents',
    '/api/upload',
    '/api/chat',
    '/api/documents/upload'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n📤 Testing: ${endpoint}`);
      
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`📥 ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        try {
          const text = await response.text();
          console.log(`❌ Error: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`);
        } catch (e) {
          console.log(`❌ Could not read error response`);
        }
      } else {
        console.log('✅ Success');
      }
      
    } catch (error) {
      console.log(`❌ Request failed: ${error.message}`);
    }
  }
}

testAPIEndpoints().catch(console.error);
