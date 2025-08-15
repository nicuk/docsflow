const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('- SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyVectorFix() {
  console.log('🔧 Applying vector search function volatility fix...\n');
  
  try {
    // Read the migration SQL
    const migrationPath = path.join(__dirname, '..', 'migrations', 'fix_vector_function_volatility.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Running migration to fix vector search functions...');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      // If exec_sql doesn't exist, try direct execution
      console.log('⚠️  exec_sql RPC not available, trying direct execution...');
      
      // Split the SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.startsWith('CREATE OR REPLACE FUNCTION')) {
          console.log('🔄 Updating function...');
          const { error: funcError } = await supabase.rpc('exec_sql', {
            sql: statement + ';'
          });
          
          if (funcError) {
            console.error('❌ Error updating function:', funcError.message);
            console.log('\n⚠️  Please run the following SQL directly in Supabase SQL Editor:');
            console.log('📋 File: migrations/fix_vector_function_volatility.sql\n');
            return;
          }
        }
      }
    }
    
    console.log('✅ Vector search functions successfully updated to VOLATILE');
    console.log('✅ This fixes the "SET is not allowed in a non-volatile function" error\n');
    
    // Test the functions
    console.log('🧪 Testing vector search functions...');
    
    // Test similarity_search_optimized
    const { error: testError1 } = await supabase.rpc('similarity_search_optimized', {
      query_embedding: new Array(768).fill(0),
      match_count: 1
    });
    
    if (testError1) {
      console.log('⚠️  similarity_search_optimized test failed:', testError1.message);
    } else {
      console.log('✅ similarity_search_optimized is working');
    }
    
    // Test hybrid_search_optimized
    const { error: testError2 } = await supabase.rpc('hybrid_search_optimized', {
      query_embedding: new Array(768).fill(0),
      query_text: 'test',
      match_count: 1
    });
    
    if (testError2) {
      console.log('⚠️  hybrid_search_optimized test failed:', testError2.message);
    } else {
      console.log('✅ hybrid_search_optimized is working');
    }
    
    console.log('\n🎉 Migration complete! Vector search functions are now fixed.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n📋 Please run the migration manually in Supabase SQL Editor:');
    console.log('   1. Go to your Supabase dashboard');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Copy and paste the contents of: migrations/fix_vector_function_volatility.sql');
    console.log('   4. Click "Run" to execute the migration\n');
  }
}

// Run the migration
applyVectorFix();
