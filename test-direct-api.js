/**
 * DIRECT API TEST
 * Test the login API directly to isolate server-side issues
 */

async function testDirectAPI() {
  console.log('🧪 DIRECT API TEST');
  console.log('==================');
  
  const url = 'http://localhost:3001/api/auth/login';
  const payload = {
    email: 'support@bitto.tech',
    password: 'Testing123?',
    rememberMe: true
  };
  
  console.log(`📤 POST ${url}`);
  console.log('📄 Payload:', JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    console.log(`📥 Response Status: ${response.status} ${response.statusText}`);
    console.log('📋 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('📄 Response Body:', text);
    
    if (response.ok) {
      try {
        const json = JSON.parse(text);
        if (json.success) {
          console.log('🎉 SUCCESS! Surgical auth fix is working!');
          console.log(`✅ User: ${json.user?.email}`);
          console.log(`✅ Tenant: ${json.user?.tenant_id}`);
          console.log(`✅ Role: ${json.user?.role}`);
        } else {
          console.log('❌ API returned success=false:', json.error);
          if (json.error === 'User profile not found') {
            console.log('🔍 RLS issue still persists - our surgical fix didn\'t work');
          }
        }
      } catch (e) {
        console.log('✅ Got 200 but couldn\'t parse JSON');
      }
    } else {
      console.log('❌ API Error - server-side issue');
      if (response.status === 500) {
        console.log('🔍 Internal Server Error - check server logs for details');
      }
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Server is not running on localhost:3000');
    }
  }
}

testDirectAPI().catch(console.error);
