// Test if middleware can find the bitto tenant
// Run this to verify the tenant lookup is working

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testTenantLookup() {
  console.log('🧪 Testing tenant lookup for bitto.localhost:3002\n');
  
  try {
    // Test 1: Check if subdomain check API works
    console.log('📍 Test 1: Checking subdomain availability API...');
    const checkResponse = await fetch('http://localhost:3002/api/subdomain/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Host': 'localhost:3002'
      },
      body: JSON.stringify({ subdomain: 'bitto' })
    });
    
    const checkData = await checkResponse.json();
    console.log('Subdomain check result:', checkData);
    console.log('');
    
    // Test 2: Access bitto subdomain directly
    console.log('📍 Test 2: Accessing bitto.localhost:3002...');
    const tenantResponse = await fetch('http://bitto.localhost:3002/', {
      headers: {
        'Host': 'bitto.localhost:3002'
      },
      redirect: 'manual' // Don't follow redirects automatically
    });
    
    console.log('Response status:', tenantResponse.status);
    console.log('Response headers:', {
      location: tenantResponse.headers.get('location'),
      'set-cookie': tenantResponse.headers.get('set-cookie')
    });
    
    if (tenantResponse.status === 307 || tenantResponse.status === 302) {
      const location = tenantResponse.headers.get('location');
      console.log('✅ Redirect detected to:', location);
      
      if (location.includes('/login')) {
        console.log('🎉 SUCCESS: Middleware recognized bitto tenant and redirected to login!');
      } else if (location.includes('/onboarding')) {
        console.log('❌ ISSUE: Middleware redirected to onboarding (tenant not found)');
      } else {
        console.log('🤔 Unexpected redirect location');
      }
    } else {
      console.log('⚠️ No redirect - status:', tenantResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testTenantLookup();
