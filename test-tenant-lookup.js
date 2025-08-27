// Direct test of tenant lookup logic
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testTenantLookup() {
  console.log('🔍 Testing tenant lookup logic...');
  
  // Test 1: Lookup by subdomain (should work)
  console.log('\n1. Testing lookup by subdomain "bitto":');
  try {
    const { data: bySubdomain, error: subdomainError } = await supabase
      .from('tenants')
      .select('*')
      .eq('subdomain', 'bitto')
      .maybeSingle();
    
    console.log('✅ Result:', { data: bySubdomain, error: subdomainError });
  } catch (err) {
    console.error('❌ Error:', err);
  }
  
  // Test 2: Lookup by UUID (should work)
  console.log('\n2. Testing lookup by UUID "2e33ba17-ad07-44b7-ae8b-937de35e91d7":');
  try {
    const { data: byUUID, error: uuidError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', '2e33ba17-ad07-44b7-ae8b-937de35e91d7')
      .maybeSingle();
    
    console.log('✅ Result:', { data: byUUID, error: uuidError });
  } catch (err) {
    console.error('❌ Error:', err);
  }
  
  // Test 3: Lookup by UUID as subdomain (should fail - this is the bug)
  console.log('\n3. Testing lookup by UUID as subdomain (THIS IS THE BUG):');
  try {
    const { data: uuidAsSubdomain, error: bugError } = await supabase
      .from('tenants')
      .select('*')
      .eq('subdomain', '2e33ba17-ad07-44b7-ae8b-937de35e91d7')
      .maybeSingle();
    
    console.log('❌ This should fail:', { data: uuidAsSubdomain, error: bugError });
  } catch (err) {
    console.error('❌ Error (expected):', err);
  }
  
  // Test 4: Check what api-tenant-validation.ts is actually doing
  console.log('\n4. Simulating api-tenant-validation.ts logic:');
  
  // Simulate the headers that should be passed
  const mockHeaders = new Map([
    ['x-tenant-subdomain', 'bitto'],
    ['x-tenant-id', '2e33ba17-ad07-44b7-ae8b-937de35e91d7']
  ]);
  
  const tenantSubdomain = mockHeaders.get('x-tenant-subdomain');
  console.log('📋 tenantSubdomain from header:', tenantSubdomain);
  
  // This is what the validation function should be doing
  try {
    const { data: validationLookup, error: validationError } = await supabase
      .from('tenants')
      .select('*')
      .eq('subdomain', tenantSubdomain)
      .single();
    
    console.log('✅ Validation lookup result:', { data: validationLookup, error: validationError });
  } catch (err) {
    console.error('❌ Validation error:', err);
  }
  
  // Test 5: List all tenants to verify data
  console.log('\n5. All tenants in database:');
  try {
    const { data: allTenants, error: listError } = await supabase
      .from('tenants')
      .select('id, subdomain, name')
      .limit(5);
    
    console.log('📊 Tenants:', allTenants);
  } catch (err) {
    console.error('❌ List error:', err);
  }
}

testTenantLookup().catch(console.error);
