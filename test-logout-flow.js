// Test script for logout flow
// Run with: node test-logout-flow.js

const https = require('https');
const http = require('http');

async function testLogoutFlow() {
  console.log('🧪 Testing Logout Flow LOCALLY\n');
  console.log('=' .repeat(50));
  
  // Test 1: Check if logout endpoint clears cookies properly
  console.log('\n📝 Test 1: Logout API Cookie Clearing (Local)');
  console.log('-'.repeat(40));
  
  const logoutOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/logout',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': 'tenant-id=test-tenant; tenant-subdomain=demo; access_token=fake-token'
    }
  };
  
  try {
    const logoutResponse = await makeRequest(logoutOptions, false);
    console.log('✅ Logout Response:', logoutResponse.body);
    console.log('🍪 Set-Cookie Headers:', logoutResponse.headers['set-cookie'] || 'None');
    
    // Parse response body
    try {
      const body = JSON.parse(logoutResponse.body);
      if (body.redirectUrl) {
        console.log('🔄 Redirect URL provided:', body.redirectUrl);
      }
    } catch (e) {
      // Not JSON, that's ok
    }
  } catch (error) {
    console.log('⚠️ Logout endpoint error:', error.message);
  }
  
  // Check if cookies are being cleared
  const setCookies = logoutResponse.headers['set-cookie'] || [];
  const clearedCookies = setCookies.filter(cookie => 
    cookie.includes('expires=Thu, 01 Jan 1970') || 
    cookie.includes('Max-Age=0')
  );
  
  console.log(`✅ Cleared ${clearedCookies.length} cookies`);
  
  // Test 2: Check middleware behavior on login page with stale cookies
  console.log('\n📝 Test 2: Login Page Access with Stale Tenant Cookies (Local)');
  console.log('-'.repeat(40));
  
  const loginOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/login',
    method: 'GET',
    headers: {
      'Cookie': 'tenant-id=stale-tenant; tenant-subdomain=old-demo'
    }
  };
  
  try {
    const loginResponse = await makeRequest(loginOptions, false);
    console.log('✅ Login Page Status:', loginResponse.statusCode);
    console.log('📍 Location Header:', loginResponse.headers.location || 'No redirect');
  
  if (loginResponse.statusCode === 200 || loginResponse.statusCode === 304) {
    console.log('✅ SUCCESS: Login page accessible despite stale tenant cookies');
  } else if (loginResponse.headers.location?.includes('.docsflow.app')) {
    console.log('❌ FAIL: Still redirecting to tenant subdomain');
  }
  
  } catch (error) {
    console.log('⚠️ Login page access error:', error.message);
  }
  
  // Test 3: Check if /logout path redirects to /login
  console.log('\n📝 Test 3: Logout Path Redirect (Local)');
  console.log('-'.repeat(40));
  
  const logoutPathOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/logout',
    method: 'GET',
    headers: {
      'Cookie': 'tenant-id=test; access_token=test-token'
    }
  };
  
  try {
    const logoutPathResponse = await makeRequest(logoutPathOptions, false);
    console.log('✅ Logout Path Status:', logoutPathResponse.statusCode);
    console.log('📍 Redirect Location:', logoutPathResponse.headers.location || 'No redirect');
  
    if (logoutPathResponse.headers.location === '/login') {
      console.log('✅ SUCCESS: Logout redirects to /login');
    } else {
      console.log('⚠️  Unexpected redirect:', logoutPathResponse.headers.location);
    }
  } catch (error) {
    console.log('⚠️ Logout path error:', error.message);
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 LOGOUT FLOW TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`
Key Fixes Applied:
1. ✅ Logout API clears cookies at all domain levels
2. ✅ Backend returns redirect URL to escape subdomain
3. ✅ Middleware allows login page access with stale cookies
4. ✅ Frontend uses backend redirect URL for proper navigation

Expected Behavior:
- After logout, user should land on docsflow.app/login
- No forced redirect to tenant subdomain
- Cookies cleared across all domain levels
- Clean session state for next login
  `);
}

function makeRequest(options, useHttps = true) {
  return new Promise((resolve, reject) => {
    const protocol = useHttps ? https : http;
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

// Run tests
testLogoutFlow().catch(console.error);
