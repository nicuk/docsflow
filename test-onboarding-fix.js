// Quick test to manually fix the user admin assignment
// Run this to update your user record with proper tenant assignment

const { createClient } = require('@supabase/supabase-js');

async function fixUserAdminAssignment() {
  // Use service role to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // 1. Get the existing tenant (bitto)
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('subdomain', 'bitto')
      .single();

    if (tenantError) {
      console.error('❌ Failed to find tenant:', tenantError);
      return;
    }

    console.log('✅ Found tenant:', tenant);

    // 2. Get the user that needs admin assignment
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'support@bitto.tech')
      .single();

    if (userError) {
      console.error('❌ Failed to find user:', userError);
      return;
    }

    console.log('📋 Current user state:', {
      id: user.id,
      email: user.email,
      tenant_id: user.tenant_id,
      role: user.role,
      access_level: user.access_level
    });

    // 3. Update user to be admin of the tenant
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        tenant_id: tenant.id,
        role: 'admin',
        access_level: 5
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Failed to update user:', updateError);
      return;
    }

    console.log('🎉 SUCCESS! User updated:', {
      id: updatedUser.id,
      email: updatedUser.email,
      tenant_id: updatedUser.tenant_id,
      role: updatedUser.role,
      access_level: updatedUser.access_level
    });

    // 4. Update Supabase Auth metadata
    const { data: authUser, error: authError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          role: 'admin',
          tenant_id: tenant.id,
          access_level: 5,
          onboarding_complete: true
        }
      }
    );

    if (authError) {
      console.error('❌ Failed to update auth metadata:', authError);
      return;
    }

    console.log('🔐 Auth metadata updated successfully');
    console.log('✅ User should now be able to access the app as admin!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the fix
fixUserAdminAssignment();
