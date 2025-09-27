/**
 * Simple Login Test - Tests the surgical SSR auth fixes
 */
const https = require('https');
const http = require('http');

const postData = JSON.stringify({
  email: 'support@bitto.tech',
  password: 'Testing123?',
  rememberMe: true
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🧪 Testing Surgical Auth Fix...');
console.log('================================');

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log('Response Headers:', res.headers);
  
  let responseBody = '';
  res.on('data', (chunk) => {
    responseBody += chunk;
  });
  
  res.on('end', () => {
    console.log('\n📋 RESPONSE BODY:');
    try {
      const json = JSON.parse(responseBody);
      console.log('✅ SUCCESS:', JSON.stringify(json, null, 2));
      
      if (json.success && json.user) {
        console.log('\n🎉 AUTH FIX WORKING!');
        console.log(`- User: ${json.user.email}`);
        console.log(`- Tenant ID: ${json.user.tenant_id}`);
        console.log(`- Role: ${json.user.role}`);
      } else if (!json.success && json.error === 'User profile not found') {
        console.log('\n❌ STILL BROKEN: RLS issue persists');
        console.log('The surgical fix didn\'t resolve the auth.uid() context issue');
      } else {
        console.log('\n❓ UNEXPECTED RESPONSE');
      }
    } catch (e) {
      console.log('Raw response:', responseBody);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Request Error: ${e.message}`);
  if (e.code === 'ECONNREFUSED') {
    console.log('💡 Make sure the dev server is running: npm run dev');
  }
});

req.write(postData);
req.end();
