const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function createTest1User() {
  console.log('🎭 Creating test1@example.com user...');
  
  // Create Supabase client with service role key for admin operations
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // First, clean up any existing test user
    console.log('🧹 Cleaning up existing test1 user...');
    
    // Delete from users table first (due to foreign key constraints)
    await supabase
      .from('users')
      .delete()
      .eq('email', 'test1@example.com');
    
    // Delete from auth users
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(u => u.email === 'test1@example.com');
    if (existingUser) {
      await supabase.auth.admin.deleteUser(existingUser.id);
      console.log('✅ Cleaned up existing user');
    }

    console.log('📧 Creating new auth user in Supabase...');
    
    // Create the user in Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'test1@example.com',
      password: 'Testing123?',
      email_confirm: true,
      user_metadata: {
        name: 'Test User 1',
        role: 'admin'
      }
    });

    if (authError) {
      console.error('❌ Auth user creation failed:', authError);
      return false;
    }

    console.log('✅ Auth user created:', authUser.user.id);

    // Find or create the test-company tenant (should exist from production)
    console.log('🏢 Checking for test-company tenant...');
    let { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('subdomain', 'test-company')
      .single();

    if (tenantError || !tenant) {
      console.log('🏢 Creating test-company tenant...');
      const { data: newTenant, error: createTenantError } = await supabase
        .from('tenants')
        .insert({
          subdomain: 'test-company',
          name: 'Test Company',
          industry: 'general',
          plan_type: 'starter',
          subscription_status: 'active',
          custom_persona: '"A helpful AI assistant for test company operations"'
        })
        .select()
        .single();

      if (createTenantError) {
        console.error('❌ Tenant creation failed:', createTenantError);
        return false;
      }
      tenant = newTenant;
    }

    console.log('✅ Tenant ready:', tenant.id);

    console.log('👤 Creating user profile...');
    
    // Create user profile in the users table
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        email: 'test1@example.com',
        name: 'Test User 1',
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

    console.log('\n🎉 TEST1 USER CREATED SUCCESSFULLY!');
    console.log('📋 Test Credentials:');
    console.log('   Email: test1@example.com');
    console.log('   Password: Testing123?');
    console.log('   Tenant: test-company');
    console.log('   Role: admin');
    console.log('   Access Level: 1');

    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

// Run the function
createTest1User()
  .then(success => {
    if (success) {
      console.log('✅ Test1 user created successfully');
      process.exit(0);
    } else {
      console.log('❌ Failed to create test1 user');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Script error:', error);
    process.exit(1);
  });
