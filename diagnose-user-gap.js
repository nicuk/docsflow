#!/usr/bin/env node

/**
 * DIAGNOSTIC SCRIPT: Find the exact user registration gap
 * This will tell us WHY support@bitto.tech is missing from public.users
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnoseUserGap() {
  console.log('🔍 DIAGNOSING USER REGISTRATION GAP...\n');

  try {
    // 1. Check auth.users
    console.log('📋 STEP 1: Checking auth.users table');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error accessing auth.users:', authError.message);
      return;
    }

    console.log(`✅ Found ${authUsers.users.length} users in auth.users`);
    
    const targetUser = authUsers.users.find(u => u.email === 'support@bitto.tech');
    if (targetUser) {
      console.log(`✅ Target user found in auth.users:`, {
        id: targetUser.id,
        email: targetUser.email,
        created_at: targetUser.created_at,
        email_verified: targetUser.email_confirmed_at ? 'YES' : 'NO',
        user_metadata: targetUser.user_metadata
      });
    } else {
      console.log('❌ Target user NOT found in auth.users');
      return;
    }

    // 2. Check public.users
    console.log('\n📋 STEP 2: Checking public.users table');
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'support@bitto.tech');

    if (publicError) {
      console.error('❌ Error accessing public.users:', publicError.message);
    } else {
      console.log(`✅ Found ${publicUsers.length} matching users in public.users`);
      if (publicUsers.length > 0) {
        console.log('✅ User exists in public.users:', publicUsers[0]);
      } else {
        console.log('❌ User MISSING from public.users');
      }
    }

    // 3. Check tenants table
    console.log('\n📋 STEP 3: Checking tenants table');
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('*')
      .eq('subdomain', 'bitto');

    if (tenantsError) {
      console.error('❌ Error accessing tenants:', tenantsError.message);
    } else {
      console.log(`✅ Found ${tenants.length} matching tenants`);
      if (tenants.length > 0) {
        console.log('✅ Bitto tenant exists:', {
          id: tenants[0].id,
          subdomain: tenants[0].subdomain,
          name: tenants[0].name
        });
      } else {
        console.log('❌ Bitto tenant NOT found');
      }
    }

    // 4. Test user creation simulation
    console.log('\n📋 STEP 4: Simulating user creation');
    
    if (targetUser && tenants.length > 0) {
      const testUserData = {
        id: targetUser.id,
        tenant_id: tenants[0].id,
        email: targetUser.email,
        name: 'Support User',
        role: 'user',
        access_level: 2
      };

      console.log('🧪 Testing INSERT with data:', testUserData);
      
      // Test the INSERT in a transaction (will rollback)
      const { error: insertError } = await supabase.rpc('test_user_insert', {
        user_data: testUserData
      });

      if (insertError) {
        console.log('❌ INSERT would fail with error:', insertError.message);
        console.log('🔍 Error details:', insertError);
      } else {
        console.log('✅ INSERT would succeed - no constraint issues');
      }

      // Alternative: Test with direct insert (catch error)
      try {
        const { error: directInsertError } = await supabase
          .from('users')
          .insert(testUserData);
        
        if (directInsertError) {
          console.log('❌ Direct INSERT failed:', directInsertError.message);
          console.log('🔍 Error code:', directInsertError.code);
          console.log('🔍 Error hint:', directInsertError.hint);
          console.log('🔍 Error details:', directInsertError.details);
        } else {
          console.log('✅ Direct INSERT succeeded - user created!');
        }
      } catch (e) {
        console.log('❌ Exception during INSERT:', e.message);
      }
    }

    // 5. Check for existing user with same ID
    console.log('\n📋 STEP 5: Checking for UUID conflicts');
    if (targetUser) {
      const { data: existingById, error: byIdError } = await supabase
        .from('users')
        .select('*')
        .eq('id', targetUser.id);

      if (byIdError) {
        console.error('❌ Error checking by ID:', byIdError.message);
      } else {
        console.log(`✅ Found ${existingById.length} users with ID ${targetUser.id}`);
        if (existingById.length > 0) {
          console.log('⚠️  User with same ID already exists:', existingById[0]);
        }
      }
    }

    // 6. Summary and recommendations
    console.log('\n📊 DIAGNOSIS SUMMARY:');
    
    const authExists = !!targetUser;
    const publicExists = publicUsers && publicUsers.length > 0;
    const tenantExists = tenants && tenants.length > 0;

    console.log(`Auth user exists: ${authExists ? '✅' : '❌'}`);
    console.log(`Public user exists: ${publicExists ? '✅' : '❌'}`);
    console.log(`Tenant exists: ${tenantExists ? '✅' : '❌'}`);

    if (authExists && !publicExists && tenantExists) {
      console.log('\n🎯 ROOT CAUSE: User exists in auth.users but missing from public.users');
      console.log('🔧 SOLUTION: Run the user creation fix');
      
      // Provide exact fix command
      console.log('\n💡 EXACT FIX COMMAND:');
      console.log(`INSERT INTO users (id, tenant_id, email, name, role, access_level)`);
      console.log(`VALUES ('${targetUser.id}', '${tenants[0].id}', '${targetUser.email}', 'Support User', 'user', 2);`);
    } else {
      console.log('\n🤔 UNEXPECTED STATE - Need manual investigation');
    }

  } catch (error) {
    console.error('💥 Diagnostic failed:', error.message);
    console.error(error);
  }
}

// Create test function for user insert
async function createTestFunction() {
  const { error } = await supabase.rpc('create_test_user_insert_function');
  if (error && !error.message.includes('already exists')) {
    console.log('Creating test function...');
    // Create the test function
    await supabase.rpc('sql', {
      query: `
        CREATE OR REPLACE FUNCTION test_user_insert(user_data jsonb)
        RETURNS void AS $$
        BEGIN
          -- This is just a test, we'll rollback
          INSERT INTO users (id, tenant_id, email, name, role, access_level)
          VALUES (
            (user_data->>'id')::uuid,
            (user_data->>'tenant_id')::uuid,
            user_data->>'email',
            user_data->>'name',
            user_data->>'role',
            (user_data->>'access_level')::integer
          );
          RAISE EXCEPTION 'Test rollback';
        END;
        $$ LANGUAGE plpgsql;
      `
    });
  }
}

// Run the diagnosis
diagnoseUserGap().then(() => {
  console.log('\n✅ Diagnosis complete');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
