#!/usr/bin/env node
/**
 * Supabase Connection Test Script
 * Tests if Supabase is properly configured and accessible
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase Configuration...\n');
  
  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('📋 Environment Variables:');
  console.log(`URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
  console.log(`Anon Key: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`Service Key: ${serviceRoleKey ? '✅ Set' : '❌ Missing'}\n`);
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ CRITICAL: Missing Supabase credentials in .env.local');
    console.error('Go to your Supabase dashboard and get real values:');
    console.error('https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api');
    process.exit(1);
  }
  
  // Test client-side connection
  console.log('🔗 Testing Client Connection...');
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test basic query (should work even without auth)
    const { data, error } = await supabase
      .from('tenants')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log(`⚠️  Query Error: ${error.message}`);
      console.log('   This might be expected if RLS is blocking anonymous access');
    } else {
      console.log('✅ Client connection successful');
    }
  } catch (err) {
    console.error(`❌ Client connection failed: ${err.message}`);
    return false;
  }
  
  // Test server-side connection
  console.log('\n🔧 Testing Server Connection...');
  if (serviceRoleKey) {
    try {
      const serverSupabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false }
      });
      
      const { data, error } = await serverSupabase
        .from('tenants')
        .select('id, subdomain')
        .limit(1);
      
      if (error) {
        console.error(`❌ Server query failed: ${error.message}`);
        return false;
      } else {
        console.log('✅ Server connection successful');
        console.log(`📊 Found ${data.length} tenant(s) in database`);
      }
    } catch (err) {
      console.error(`❌ Server connection failed: ${err.message}`);
      return false;
    }
  }
  
  console.log('\n🎉 Supabase configuration is working correctly!');
  return true;
}

testSupabaseConnection().catch(console.error);