const { createClient } = require('@supabase/supabase-js');

// This script helps test user creation in Supabase
// Run with: node scripts/create-test-user.js

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestUser() {
  try {
    console.log('Creating test user...');
    
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'test@example.com',
      password: 'testpassword123',
      email_confirm: true,
      user_metadata: {
        role: 'user',
        access_level: 3
      }
    });

    if (error) {
      console.error('Error creating user:', error);
      return;
    }

    console.log('User created successfully:', data.user.email);
    
    // Create user profile
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: data.user.id,
        email: data.user.email,
        role: 'user',
        access_level: 3,
        created_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
    } else {
      console.log('User profile created successfully');
    }

  } catch (error) {
    console.error('Script error:', error);
  }
}

createTestUser(); 