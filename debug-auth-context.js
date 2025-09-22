#!/usr/bin/env node

/**
 * ROOT CAUSE INVESTIGATION: Authentication Context Differences
 * 
 * GOAL: Identify WHY the same query works in test but fails in production
 * ISSUE: PGRST116 "The result contains 0 rows" in production, success in test
 */

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const TARGET_USER_ID = 'cc362aeb-bf97-4260-9dfb-bb1725c9c202';
const TARGET_EMAIL = 'support@bitto.tech';

// Mock auth token (from production logs)
const MOCK_AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsImtpZCI6IndJVnZLekpxUThYamVhOVEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2xoY29wd3dpcXdqcHpiZG5qb3ZvLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJjYzM2MmFlYi1iZjk3LTQyNjAtOWRmYi1iYjE3MjVjOWMyMDIiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU4NTI2NDYxLCJpYXQiOjE3NTg1MjI4NjEsImVtYWlsIjoic3VwcG9ydEBiaXR0by50ZWNoIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJhY2Nlc3NfbGV2ZWwiOjIsImNvbXBhbnlfbmFtZSI6ImJpdHRvIiwiZW1haWwiOiJzdXBwb3J0QGJpdHRvLnRlY2giLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJyb2xlIjoidXNlciIsInN1YiI6ImNjMzYyYWViLWJmOTctNDI2MC05ZGZiLWJiMTcyNWM5YzIwMiJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzU4NTIyODYxfV0sInNlc3Npb25faWQiOiJhOTY2MTEzNy0xY2Q3LTRmMWEtOGE4MC04OWRiMThlNmEyNGQiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.izMHg18UKpzsMWoJfUF3j1A2AffS0ndAJ4Xl8htyCrI';

async function testAuthContext() {
  console.log('🔍 AUTHENTICATION CONTEXT DEBUGGING');
  console.log('=====================================');
  console.log(`Target User: ${TARGET_EMAIL} (${TARGET_USER_ID})`);
  console.log('');

  // TEST 1: Service Role Client (Our Successful Test)
  await testServiceRoleClient();
  
  // TEST 2: SSR Client with Anon Key (Production Equivalent)
  await testSSRClientAnon();
  
  // TEST 3: SSR Client with Auth Token (Closest to Production)
  await testSSRClientWithAuth();
  
  // TEST 4: Direct Anon Client (Basic Case)
  await testAnonClient();
  
  // TEST 5: RLS Policy Investigation
  await investigateRLS();
}

async function testServiceRoleClient() {
  console.log('🧪 TEST 1: Service Role Client (Our Successful Test)');
  console.log('─'.repeat(60));
  
  try {
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: userProfile, error: profileError } = await serviceClient
      .from('users')
      .select(`
        id,
        email,
        name,
        role,
        tenant_id,
        created_at
      `)
      .eq('id', TARGET_USER_ID)
      .single();
    
    console.log('📊 Result:', {
      success: !profileError,
      userProfile: userProfile ? 'EXISTS' : 'NULL',
      email: userProfile?.email,
      tenantId: userProfile?.tenant_id?.substring(0, 8) + '...',
      error: profileError?.message
    });
    
    if (profileError) {
      console.log('🚨 Error Details:', profileError);
    }
    
  } catch (error) {
    console.log('💥 Exception:', error.message);
  }
  console.log('');
}

async function testSSRClientAnon() {
  console.log('🧪 TEST 2: SSR Client with Anon Key (Production Setup)');
  console.log('─'.repeat(60));
  
  try {
    // Simulate the exact SSR client setup from session API
    const ssrClient = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return []; // No cookies
        },
        setAll(cookiesToSet) {
          // Can't set cookies in this context
        }
      }
    });
    
    const { data: userProfile, error: profileError } = await ssrClient
      .from('users')
      .select(`
        id,
        email,
        name,
        role,
        tenant_id,
        created_at
      `)
      .eq('id', TARGET_USER_ID)
      .single();
    
    console.log('📊 Result:', {
      success: !profileError,
      userProfile: userProfile ? 'EXISTS' : 'NULL',
      email: userProfile?.email,
      error: profileError?.message,
      errorCode: profileError?.code
    });
    
    if (profileError) {
      console.log('🚨 Error Details:', profileError);
    }
    
  } catch (error) {
    console.log('💥 Exception:', error.message);
  }
  console.log('');
}

async function testSSRClientWithAuth() {
  console.log('🧪 TEST 3: SSR Client with Auth Token (Closest to Production)');
  console.log('─'.repeat(60));
  
  try {
    // Simulate SSR client with auth token from production
    const ssrClient = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return [
            { name: 'sb-auth-token', value: MOCK_AUTH_TOKEN }
          ];
        },
        setAll(cookiesToSet) {
          // Can't set cookies in this context
        }
      }
    });
    
    // First, try to set the session manually
    await ssrClient.auth.setSession({
      access_token: MOCK_AUTH_TOKEN,
      refresh_token: 'mock-refresh'
    });
    
    const { data: userProfile, error: profileError } = await ssrClient
      .from('users')
      .select(`
        id,
        email,
        name,
        role,
        tenant_id,
        created_at
      `)
      .eq('id', TARGET_USER_ID)
      .single();
    
    console.log('📊 Result:', {
      success: !profileError,
      userProfile: userProfile ? 'EXISTS' : 'NULL',
      email: userProfile?.email,
      error: profileError?.message,
      errorCode: profileError?.code
    });
    
    if (profileError) {
      console.log('🚨 Error Details:', profileError);
    }
    
  } catch (error) {
    console.log('💥 Exception:', error.message);
  }
  console.log('');
}

async function testAnonClient() {
  console.log('🧪 TEST 4: Direct Anon Client (Basic Case)');
  console.log('─'.repeat(60));
  
  try {
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data: userProfile, error: profileError } = await anonClient
      .from('users')
      .select(`
        id,
        email,
        name,
        role,
        tenant_id,
        created_at
      `)
      .eq('id', TARGET_USER_ID)
      .single();
    
    console.log('📊 Result:', {
      success: !profileError,
      userProfile: userProfile ? 'EXISTS' : 'NULL',
      email: userProfile?.email,
      error: profileError?.message,
      errorCode: profileError?.code
    });
    
    if (profileError) {
      console.log('🚨 Error Details:', profileError);
    }
    
  } catch (error) {
    console.log('💥 Exception:', error.message);
  }
  console.log('');
}

async function investigateRLS() {
  console.log('🧪 TEST 5: RLS Policy Investigation');
  console.log('─'.repeat(60));
  
  try {
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if RLS is enabled on users table
    const { data: rlsInfo } = await serviceClient
      .from('pg_tables')
      .select('*')
      .eq('tablename', 'users');
    
    console.log('📊 Users table info:', rlsInfo);
    
    // Try to get RLS policies
    const { data: policies } = await serviceClient
      .rpc('get_rls_policies', { table_name: 'users' })
      .catch(() => ({ data: null }));
    
    if (policies) {
      console.log('🔒 RLS Policies:', policies);
    } else {
      console.log('ℹ️ Could not retrieve RLS policies (expected)');
    }
    
    // Test with different auth contexts
    console.log('\n🔍 Testing auth context differences...');
    
    // Service role should bypass RLS
    const { data: serviceCount } = await serviceClient
      .from('users')
      .select('id', { count: 'exact' })
      .eq('id', TARGET_USER_ID);
    
    console.log('📊 Service role can see user:', serviceCount);
    
    // Anon role should respect RLS
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: anonCount } = await anonClient
      .from('users')
      .select('id', { count: 'exact' })
      .eq('id', TARGET_USER_ID);
    
    console.log('📊 Anon role can see user:', anonCount);
    
  } catch (error) {
    console.log('💥 RLS Investigation Exception:', error.message);
  }
  console.log('');
}

// Main execution
console.log('🚀 Starting Authentication Context Investigation...\n');

testAuthContext()
  .then(() => {
    console.log('🏁 INVESTIGATION COMPLETE');
    console.log('========================');
    console.log('');
    console.log('🎯 KEY INSIGHTS TO LOOK FOR:');
    console.log('1. Service Role vs SSR Client differences');
    console.log('2. RLS policy blocking authenticated queries');
    console.log('3. Authentication context not properly established');
    console.log('4. Cookie/session setup differences');
    console.log('');
    console.log('📋 Next steps based on results:');
    console.log('- If Service Role works but SSR fails → RLS/auth context issue');
    console.log('- If all fail → User/data issue');
    console.log('- If patterns emerge → Focus on specific auth setup');
  })
  .catch(error => {
    console.error('💥 INVESTIGATION FAILED:', error);
    process.exit(1);
  });
