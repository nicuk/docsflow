const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function createPlaywrightTestUser() {
  console.log('🎭 Creating Playwright test user...');
  
  // Create Supabase client with service role key for admin operations
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Service role can create users
  );

  try {
    // First, clean up any existing test user
    console.log('🧹 Cleaning up existing test user...');
    
    // Delete from users table first (due to foreign key constraints)
    await supabase
      .from('users')
      .delete()
      .eq('email', 'playwright-test@example.com');
    
    // Delete from auth users
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(u => u.email === 'playwright-test@example.com');
    if (existingUser) {
      await supabase.auth.admin.deleteUser(existingUser.id);
      console.log('✅ Cleaned up existing user');
    }

    console.log('📧 Creating new auth user in Supabase...');
    
    // Create the user in Supabase Auth with the correct password
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'playwright-test@example.com',
      password: 'Testing123?', // Correct password for tests
      email_confirm: true, // Skip email confirmation for test user
      user_metadata: {
        name: 'Playwright Test User',
        role: 'admin'
      }
    });

    if (authError) {
      console.error('❌ Auth user creation failed:', authError);
      return false;
    }

    console.log('✅ Auth user created:', authUser.user.id);

    // Check if test tenant exists, create if not
    console.log('🏢 Checking for test tenant...');
    
    let tenant;
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select()
      .eq('subdomain', 'playwright-test')
      .single();

    if (existingTenant) {
      tenant = existingTenant;
      console.log('✅ Using existing tenant:', tenant.id);
    } else {
      const { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: 'Playwright Test Company',
          subdomain: 'playwright-test',
          industry: 'general',
          custom_persona: 'A helpful AI assistant for Playwright testing operations'
        })
        .select()
        .single();

      if (tenantError) {
        console.error('❌ Tenant creation failed:', tenantError);
        return false;
      }

      tenant = newTenant;
      console.log('✅ Tenant created:', tenant.id);
    }

    // Create user profile in users table
    console.log('👤 Creating user profile...');
    
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        email: 'playwright-test@example.com',
        name: 'Playwright Test User',
        tenant_id: tenant.id,
        role: 'admin',
        access_level: 1
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ User profile creation failed:', profileError);
      return false;
    }

    console.log('✅ User profile created');

    console.log('\n🎉 PLAYWRIGHT TEST USER CREATED SUCCESSFULLY!');
    console.log('📋 Test Credentials:');
    console.log('   Email: playwright-test@example.com');
    console.log('   Password: Testing123?');
    console.log('   Tenant: playwright-test');
    console.log('   Subdomain: playwright-test.docsflow.app');
    console.log('   Role: admin');
    console.log('   Access Level: 1 (admin access)');
    console.log('\n🚀 Test URLs:');
    console.log('   Local: http://localhost:3000/login');
    console.log('   Subdomain: https://playwright-test.docsflow.app/login');

    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

// Also create a function to create a basic test user for the existing tenant
async function createBasicTestUser() {
  console.log('🎭 Creating basic test user for existing tenant...');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Clean up existing test user
    console.log('🧹 Cleaning up existing basic test user...');
    
    await supabase
      .from('users')
      .delete()
      .eq('email', 'test@example.com');
    
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(u => u.email === 'test@example.com');
    if (existingUser) {
      await supabase.auth.admin.deleteUser(existingUser.id);
    }

    // Create new user with correct password
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'test@example.com',
      password: 'Testing123?', // Correct password
      email_confirm: true,
      user_metadata: {
        name: 'Test User',
        role: 'admin'
      }
    });

    if (authError) {
      console.error('❌ Auth user creation failed:', authError);
      return false;
    }

    // Get existing test-company tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select()
      .eq('subdomain', 'test-company')
      .single();

    if (!tenant) {
      console.error('❌ test-company tenant not found');
      return false;
    }

    // Create user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        email: 'test@example.com',
        name: 'Test User',
        tenant_id: tenant.id,
        role: 'admin',
        access_level: 1
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ User profile creation failed:', profileError);
      return false;
    }

    console.log('\n✅ BASIC TEST USER UPDATED!');
    console.log('📋 Credentials:');
    console.log('   Email: test@example.com');
    console.log('   Password: Testing123?');
    console.log('   Tenant: test-company');

    return true;

  } catch (error) {
    console.error('❌ Error creating basic test user:', error);
    return false;
  }
}

// Run the script
if (require.main === module) {
  const action = process.argv[2];
  
  if (action === 'basic') {
    createBasicTestUser()
      .then((success) => {
        if (success) {
          console.log('✅ Basic test user created successfully');
        } else {
          console.log('❌ Failed to create basic test user');
        }
        process.exit(success ? 0 : 1);
      });
  } else {
    createPlaywrightTestUser()
      .then((success) => {
        if (success) {
          console.log('✅ Playwright test user created successfully');
        } else {
          console.log('❌ Failed to create Playwright test user');
        }
        process.exit(success ? 0 : 1);
      });
  }
}

module.exports = { createPlaywrightTestUser, createBasicTestUser };
