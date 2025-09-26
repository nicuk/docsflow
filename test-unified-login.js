// COMPREHENSIVE TEST: Unified Login Route with Real Credentials
const http = require('http');

const testUnifiedLogin = async () => {
  console.log('🧪 TESTING UNIFIED LOGIN ROUTE');
  console.log('=================================');
  console.log('📧 Email: support@bitto.tech');
  console.log('🔐 Password: Testing123?');
  console.log('🎯 Endpoint: /api/auth/login-unified');
  console.log('');

  const data = JSON.stringify({
    email: 'support@bitto.tech',
    password: 'Testing123?',
    rememberMe: true
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login-unified',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
      'Origin': 'http://localhost:3000'
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      console.log(`🔍 RESPONSE STATUS: ${res.statusCode}`);
      console.log(`📊 RESPONSE HEADERS:`);
      console.log(JSON.stringify(res.headers, null, 2));
      
      // Check for cookies
      const cookies = res.headers['set-cookie'];
      if (cookies) {
        console.log(`\n🍪 COOKIES SET (${cookies.length} total):`);
        cookies.forEach((cookie, index) => {
          const cookieName = cookie.split('=')[0];
          const isSecure = cookie.includes('Secure');
          const domain = cookie.match(/Domain=([^;]+)/)?.[1] || 'none';
          const maxAge = cookie.match(/Max-Age=([^;]+)/)?.[1] || 'session';
          
          console.log(`  ${index + 1}. ${cookieName} (Domain: ${domain}, MaxAge: ${maxAge}${isSecure ? ', Secure' : ''})`);
        });
        
        // Check for required tenant cookies
        const requiredCookies = ['tenant-id', 'user-email', 'tenant-subdomain', 'tenant-context', 'auth-token'];
        console.log(`\n🎯 REQUIRED COOKIE CHECK:`);
        requiredCookies.forEach(cookieName => {
          const found = cookies.find(c => c.startsWith(cookieName + '='));
          console.log(`  ${found ? '✅' : '❌'} ${cookieName}: ${found ? 'SET' : 'MISSING'}`);
        });
      } else {
        console.log(`\n❌ NO COOKIES SET`);
      }
      
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        console.log(`\n📄 RESPONSE BODY:`);
        try {
          const response = JSON.parse(body);
          console.log(JSON.stringify(response, null, 2));
          
          if (response.success) {
            console.log('\n✅ LOGIN SUCCESS ANALYSIS:');
            console.log(`   User ID: ${response.user?.id}`);
            console.log(`   Email: ${response.user?.email}`);
            console.log(`   Tenant ID: ${response.user?.tenant_id}`);
            console.log(`   Subdomain: ${response.user?.tenant?.subdomain}`);
            console.log(`   Role: ${response.user?.role}`);
            console.log(`   Access Level: ${response.user?.access_level}`);
            console.log(`   Session Token: ${response.session?.access_token ? 'Present (' + response.session.access_token.length + ' chars)' : 'Missing'}`);
            
            // Validate multi-tenant data
            if (response.user?.tenant_id && response.user?.tenant?.subdomain) {
              console.log('\n🏢 MULTI-TENANT VALIDATION: ✅ PASSED');
            } else {
              console.log('\n🏢 MULTI-TENANT VALIDATION: ❌ FAILED');
            }
          } else {
            console.log('\n❌ LOGIN FAILED:');
            console.log(`   Error: ${response.error}`);
          }
          
          resolve(response);
        } catch (e) {
          console.log('❌ Response parsing failed:', e.message);
          console.log('Raw response:', body);
          resolve({ error: 'Invalid JSON response', raw: body });
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ REQUEST FAILED:', error.message);
      reject(error);
    });

    req.write(data);
    req.end();
  });
};

// Run the test
testUnifiedLogin()
  .then(result => {
    console.log('\n🎯 TEST COMPLETED');
    console.log('==================');
    if (result.success) {
      console.log('✅ UNIFIED ROUTE: WORKING PERFECTLY');
      console.log('✅ READY FOR FRONTEND MIGRATION');
    } else {
      console.log('❌ UNIFIED ROUTE: NEEDS DEBUGGING');
      console.log('❌ DO NOT MIGRATE YET');
    }
  })
  .catch(error => {
    console.log('\n🚨 TEST FAILED:', error.message);
    console.log('❌ SERVER NOT RUNNING OR CONNECTION FAILED');
  });

