const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function createTestUser() {
  console.log('🚀 Creating test user...');
  
  // Create Supabase client with service role key for admin operations
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Service role can create users
  );

  try {
    console.log('📧 Creating auth user in Supabase...');
    
    // Create the user in Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'test@example.com',
      password: 'password123',
      email_confirm: true, // Skip email confirmation for test user
      user_metadata: {
        name: 'Test User',
        role: 'admin'
      }
    });

    if (authError) {
      console.error('❌ Auth user creation failed:', authError);
      return;
    }

    console.log('✅ Auth user created:', authUser.user.id);

    // Create a test tenant first
    console.log('🏢 Creating test tenant...');
    
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: 'Test Company',
        subdomain: 'test-company',
        industry: 'general',
        custom_persona: 'A helpful AI assistant for test company operations'
      })
      .select()
      .single();

    if (tenantError) {
      console.error('❌ Tenant creation failed:', tenantError);
      return;
    }

    console.log('✅ Tenant created:', tenant.id);

    // Create user profile in users table
    console.log('👤 Creating user profile...');
    
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        email: 'test@example.com',
        name: 'Test User',
        tenant_id: tenant.id,
        role: 'admin',
        access_level: 5, // Full admin access
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ User profile creation failed:', profileError);
      return;
    }

    console.log('✅ User profile created');

    console.log('\n🎉 TEST USER CREATED SUCCESSFULLY!');
    console.log('📋 Test Credentials:');
    console.log('   Email: test@example.com');
    console.log('   Password: password123');
    console.log('   Tenant: test-company');
    console.log('   Role: admin');
    console.log('   Access Level: 5 (full access)');
    console.log('\n🚀 You can now test login at: http://localhost:3000/login');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
if (require.main === module) {
  createTestUser()
    .then(() => {
      console.log('✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createTestUser };
createTestUser(); 