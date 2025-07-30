#!/usr/bin/env node

// CREATE TEST DATA FOR INTEGRATION TESTING
// This script creates test users and tenants for real authentication testing

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestData() {
  console.log('🔥 Creating test data for integration...\n');

  try {
    // 1. Create test tenant
    console.log('1️⃣ Creating test tenant...');
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .upsert({
        id: '550e8400-e29b-41d4-a716-446655440000',
        subdomain: 'demo',
        name: 'Demo Company',
        industry: 'technology',
        subscription_status: 'trial',
        plan_type: 'pro',
        custom_persona: {
          role: 'AI Assistant',
          focus_areas: ['customer_support', 'sales'],
          tone: 'professional'
        }
      }, {
        onConflict: 'subdomain'
      })
      .select()
      .single();

    if (tenantError) {
      console.error('   ❌ Tenant creation failed:', tenantError.message);
    } else {
      console.log('   ✅ Test tenant created:', tenant.subdomain);
    }

    // 2. Create test user via Supabase Auth
    console.log('2️⃣ Creating test user...');
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'test@docsflow.app',
      password: 'testpass123',
      email_confirm: true
    });

    if (authError && !authError.message.includes('already registered')) {
      console.error('   ❌ Auth user creation failed:', authError.message);
    } else {
      console.log('   ✅ Test user created: test@docsflow.app');
    }

    // 3. Create user profile
    console.log('3️⃣ Creating user profile...');
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .upsert({
        id: authUser?.user?.id || '660e8400-e29b-41d4-a716-446655440000',
        email: 'test@docsflow.app',
        tenant_id: tenant?.id || '550e8400-e29b-41d4-a716-446655440000',
        access_level: 3
      }, {
        onConflict: 'email'
      })
      .select()
      .single();

    if (profileError) {
      console.error('   ❌ User profile creation failed:', profileError.message);
    } else {
      console.log('   ✅ User profile created');
    }

    // 4. Create sample documents
    console.log('4️⃣ Creating sample documents...');
    const { data: document, error: docError } = await supabase
      .from('documents')
      .upsert({
        id: '770e8400-e29b-41d4-a716-446655440000',
        tenant_id: tenant?.id || '550e8400-e29b-41d4-a716-446655440000',
        filename: 'sample-document.pdf',
        content: 'This is a sample document for testing purposes.',
        file_size: 1024,
        mime_type: 'application/pdf',
        processing_status: 'completed'
      }, {
        onConflict: 'id'
      });

    if (docError) {
      console.error('   ❌ Document creation failed:', docError.message);
    } else {
      console.log('   ✅ Sample document created');
    }

    console.log('\n🎉 Test data creation complete!');
    console.log('\nTest Credentials:');
    console.log('Email: test@docsflow.app');
    console.log('Password: testpass123');
    console.log('Tenant: demo.docsflow.app');

  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  }
}

createTestData();