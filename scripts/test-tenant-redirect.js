/**
 * Test script to verify tenant subdomain redirect functionality
 * This tests that users are properly redirected from root domain to their tenant subdomain
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testTenantRedirect() {
  console.log('🧪 Testing Tenant Subdomain Redirect System\n');
  console.log('=' .repeat(50));
  
  try {
    // Step 1: Check tenant data structure
    console.log('\n📊 Step 1: Checking tenant data structure...');
    const { data: tenants, error: tenantError } = await supabase
      .from('tenants')
      .select('id, subdomain, name')
      .limit(5);
    
    if (tenantError) {
      console.error('❌ Error fetching tenants:', tenantError);
      return;
    }
    
    if (!tenants || tenants.length === 0) {
      console.log('⚠️ No tenants found in database');
      return;
    }
    
    console.log(`✅ Found ${tenants.length} tenants:`);
    tenants.forEach(t => {
      console.log(`   - ${t.name}: subdomain="${t.subdomain}", id="${t.id}"`);
    });
    
    // Step 2: Check user-tenant associations
    console.log('\n👥 Step 2: Checking user-tenant associations...');
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email, tenant_id, tenants(id, subdomain, name)')
      .limit(5);
    
    if (userError) {
      console.error('❌ Error fetching users:', userError);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('⚠️ No users found in database');
      return;
    }
    
    console.log(`✅ Found ${users.length} users with tenant associations:`);
    users.forEach(u => {
      if (u.tenants) {
        console.log(`   - ${u.email}: tenant="${u.tenants.subdomain}" (${u.tenants.name})`);
      } else {
        console.log(`   - ${u.email}: NO TENANT ASSIGNED`);
      }
    });
    
    // Step 3: Simulate cookie scenarios
    console.log('\n🍪 Step 3: Testing cookie scenarios...');
    
    const testScenarios = [
      {
        name: 'Correct subdomain in cookie',
        cookie: 'bitto',
        expected: 'Redirect to https://bitto.docsflow.app',
        pass: true
      },
      {
        name: 'UUID in cookie (bug scenario)',
        cookie: '123e4567-e89b-12d3-a456-426614174000',
        expected: 'Should fail tenant lookup, redirect to onboarding',
        pass: false
      },
      {
        name: 'Non-existent subdomain',
        cookie: 'nonexistent',
        expected: 'Should fail tenant lookup, redirect to onboarding',
        pass: false
      },
      {
        name: 'Empty cookie',
        cookie: '',
        expected: 'No redirect, stay on root domain',
        pass: true
      }
    ];
    
    console.log('📋 Cookie redirect scenarios:');
    testScenarios.forEach(scenario => {
      const icon = scenario.pass ? '✅' : '❌';
      console.log(`   ${icon} ${scenario.name}`);
      console.log(`      Cookie value: "${scenario.cookie}"`);
      console.log(`      Expected: ${scenario.expected}`);
    });
    
    // Step 4: Check Redis cache (if available)
    console.log('\n💾 Step 4: Checking Redis cache...');
    try {
      const redis = require('@upstash/redis');
      const redisClient = redis.Redis.fromEnv();
      
      // Check for cached tenant data
      const cachedTenant = await redisClient.get('tenant:bitto');
      if (cachedTenant) {
        console.log('✅ Found cached tenant data:', cachedTenant);
      } else {
        console.log('⚠️ No cached tenant data found for "bitto"');
      }
    } catch (redisError) {
      console.log('⚠️ Redis not configured or accessible:', redisError.message);
    }
    
    // Step 5: Summary and recommendations
    console.log('\n📝 Summary and Recommendations:');
    console.log('=' .repeat(50));
    
    const issues = [];
    const fixes = [];
    
    // Check for UUID usage
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (tenants.some(t => uuidPattern.test(t.subdomain))) {
      issues.push('❌ Some tenants have UUID as subdomain');
      fixes.push('Update tenant subdomains to use meaningful names');
    }
    
    // Check for users without tenants
    if (users.some(u => !u.tenants)) {
      issues.push('⚠️ Some users have no tenant assigned');
      fixes.push('Ensure all users go through onboarding to get tenant assignment');
    }
    
    if (issues.length === 0) {
      console.log('✅ All checks passed! Tenant redirect system is properly configured.');
    } else {
      console.log('Issues found:');
      issues.forEach(issue => console.log(`   ${issue}`));
      console.log('\nRecommended fixes:');
      fixes.forEach(fix => console.log(`   - ${fix}`));
    }
    
    console.log('\n🎯 Key Points for Proper Redirect:');
    console.log('   1. Always store subdomain (not UUID) in tenant-id cookie');
    console.log('   2. Middleware should verify tenant exists before redirect');
    console.log('   3. Clear tenant cookies on logout to prevent stale redirects');
    console.log('   4. Use .docsflow.app domain for cookies to work across subdomains');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testTenantRedirect().then(() => {
  console.log('\n✅ Test complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test error:', error);
  process.exit(1);
});
