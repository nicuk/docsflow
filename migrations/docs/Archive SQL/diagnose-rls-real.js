#!/usr/bin/env node

/**
 * RLS DIAGNOSTIC: Test the actual RLS policy failure
 * Now we know the user exists - let's test the exact INSERT that's failing
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

async function testRLSPolicies() {
  console.log('🔍 TESTING RLS POLICIES FOR CONVERSATION CREATION...\n');

  const userId = 'cc362aeb-bf97-4260-9dfb-bb1725c9c202';
  const tenantId = '122928f6-f34e-484b-9a69-7e1f25caf45c';

  try {
    // 1. Test with service role (should always work)
    console.log('📋 STEP 1: Testing with SERVICE ROLE (bypasses RLS)');
    const { error: serviceError } = await supabaseAdmin
      .from('chat_conversations')
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        title: 'Service Role Test'
      });

    if (serviceError) {
      console.log('❌ Service role INSERT failed:', serviceError.message);
    } else {
      console.log('✅ Service role INSERT succeeded');
      // Clean up
      await supabaseAdmin
        .from('chat_conversations')
        .delete()
        .eq('title', 'Service Role Test');
    }

    // 2. Check current RLS policies
    console.log('\n📋 STEP 2: Checking current RLS policies');
    const { data: policies, error: policyError } = await supabaseAdmin
      .rpc('get_rls_policies', { table_name: 'chat_conversations' });

    if (policyError) {
      console.log('❌ Could not fetch policies:', policyError.message);
    } else {
      console.log('✅ Current RLS policies:');
      console.log(JSON.stringify(policies, null, 2));
    }

    // 3. Test with authenticated user (simulate the actual failing request)
    console.log('\n📋 STEP 3: Testing with AUTHENTICATED USER context');
    
    // First, get a real auth session for the user
    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
      email: 'support@bitto.tech',
      password: 'Testing123?'
    });

    if (authError) {
      console.log('❌ Could not authenticate user:', authError.message);
      console.log('⚠️  Will test without real session');
    } else {
      console.log('✅ User authenticated successfully');
      
      // Now test the INSERT with the authenticated session
      const authenticatedSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${authData.session.access_token}`
          }
        }
      });

      const { error: authInsertError } = await authenticatedSupabase
        .from('chat_conversations')
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          title: 'Authenticated Test'
        });

      if (authInsertError) {
        console.log('❌ Authenticated INSERT failed:', authInsertError.message);
        console.log('🔍 Error code:', authInsertError.code);
        console.log('🔍 Error details:', authInsertError.details);
      } else {
        console.log('✅ Authenticated INSERT succeeded');
        // Clean up
        await authenticatedSupabase
          .from('chat_conversations')
          .delete()
          .eq('title', 'Authenticated Test');
      }
    }

    // 4. Test auth.uid() function
    console.log('\n📋 STEP 4: Testing auth.uid() function');
    const { data: authUidTest, error: authUidError } = await supabaseAdmin
      .rpc('test_auth_uid');

    if (authUidError) {
      console.log('❌ auth.uid() test failed:', authUidError.message);
    } else {
      console.log('✅ auth.uid() result:', authUidTest);
    }

    // 5. Manual policy condition testing
    console.log('\n📋 STEP 5: Testing policy conditions manually');
    
    // Test if user_id = auth.uid() would work
    const { data: userCheck, error: userCheckError } = await supabaseAdmin
      .from('users')
      .select('id, email, tenant_id, role')
      .eq('id', userId);

    if (userCheckError) {
      console.log('❌ User verification failed:', userCheckError.message);
    } else {
      console.log('✅ User data:', userCheck[0]);
    }

    // Test tenant lookup
    const { data: tenantCheck, error: tenantCheckError } = await supabaseAdmin
      .from('tenants')
      .select('id, subdomain')
      .eq('subdomain', 'bitto');

    if (tenantCheckError) {
      console.log('❌ Tenant verification failed:', tenantCheckError.message);
    } else {
      console.log('✅ Tenant data:', tenantCheck[0]);
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Create helper functions for testing
async function createHelperFunctions() {
  // Create RLS policy getter
  await supabaseAdmin.rpc('create_policy_getter', {
    sql: `
      CREATE OR REPLACE FUNCTION get_rls_policies(table_name text)
      RETURNS TABLE(policyname name, cmd text, roles text[], qual text, with_check text)
      AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          p.policyname,
          p.cmd::text,
          p.roles,
          p.qual,
          p.with_check
        FROM pg_policies p
        WHERE p.tablename = table_name;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `
  });

  // Create auth.uid() tester
  await supabaseAdmin.rpc('create_auth_uid_tester', {
    sql: `
      CREATE OR REPLACE FUNCTION test_auth_uid()
      RETURNS uuid
      AS $$
      BEGIN
        RETURN auth.uid();
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `
  });
}

// Run the test
createHelperFunctions()
  .then(() => testRLSPolicies())
  .then(() => {
    console.log('\n✅ RLS diagnosis complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
