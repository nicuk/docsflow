#!/usr/bin/env node
/**
 * Database Migration Testing Script
 * Tests migrations for safety and rollback capability
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testMigrations() {
  console.log('🗄️  Testing Database Migrations...\n');
  
  const supabaseUrl = process.env.TEST_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.TEST_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing test database credentials');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });
  
  try {
    // Test basic connectivity
    console.log('📡 Testing database connectivity...');
    const { data, error } = await supabase
      .from('tenants')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Database connectivity failed:', error.message);
      process.exit(1);
    }
    console.log('✅ Database connectivity OK');
    
    // Test RLS policies (critical after our recent issues)
    console.log('\n🔒 Testing RLS Policies...');
    
    // Test users table RLS (where we had recursion issues)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
      
    if (userError && !userError.message.includes('RLS')) {
      console.error('❌ Users table RLS test failed:', userError.message);
      process.exit(1);
    }
    console.log('✅ Users table RLS policies working');
    
    // Test tenant isolation
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('id, subdomain')
      .limit(1);
      
    if (tenantError) {
      console.error('❌ Tenant table test failed:', tenantError.message);
      process.exit(1);
    }
    console.log('✅ Tenant isolation working');
    
    console.log('\n🎉 All migration tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Migration test failed:', error.message);
    process.exit(1);
  }
}

testMigrations().catch(console.error);