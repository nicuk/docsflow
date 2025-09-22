const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function fixTestUser() {
  console.log('🔧 Fixing test user setup...');
  
  // Create Supabase client with service role key for admin operations
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // First, let's get the existing auth user
    console.log('👤 Finding existing auth user...');
    
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      return;
    }
    
    const testUser = authUsers.users.find(user => user.email === 'test@example.com');
    
    if (!testUser) {
      console.error('❌ Test user not found in auth');
      return;
    }
    
    console.log('✅ Found existing auth user:', testUser.id);

    // Check if tenant already exists
    const { data: existingTenant, error: tenantCheckError } = await supabase
      .from('tenants')
      .select('*')
      .eq('subdomain', 'test-company')
      .single();

    let tenant;
    if (existingTenant) {
      console.log('✅ Tenant already exists:', existingTenant.id);
      tenant = existingTenant;
    } else {
      // Create tenant
      console.log('🏢 Creating test tenant...');
      
      const { data: newTenant, error: tenantError } = await supabase
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

      console.log('✅ Tenant created:', newTenant.id);
      tenant = newTenant;
    }

    // Check if user profile already exists
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('users')
      .select('*')
      .eq('id', testUser.id)
      .single();

    if (existingProfile) {
      console.log('✅ User profile already exists');
    } else {
      // Create user profile
      console.log('👤 Creating user profile...');
      
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .insert({
          id: testUser.id,
          email: 'test@example.com',
          name: 'Test User',
          tenant_id: tenant.id,
          role: 'admin',
          access_level: 1 // Admin access
        })
        .select()
        .single();

      if (profileError) {
        console.error('❌ User profile creation failed:', profileError);
        return;
      }

      console.log('✅ User profile created');
    }

    console.log('\n🎉 TEST USER SETUP COMPLETE!');
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
  fixTestUser()
    .then(() => {
      console.log('✅ Fix script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fix script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixTestUser };
