#!/usr/bin/env node
/**
 * Production Migration Runner
 * Safely runs database migrations in production
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  console.log('🚀 Running Production Migrations...\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing production database credentials');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });
  
  try {
    // Create migration tracking table if it doesn't exist
    console.log('📋 Setting up migration tracking...');
    
    const { error: createError } = await supabase.rpc('create_migration_table');
    if (createError && !createError.message.includes('already exists')) {
      console.error('❌ Failed to create migration table:', createError.message);
      process.exit(1);
    }
    
    // Get list of migration files
    const migrationsDir = path.join(__dirname, '../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql') && /^\d+_/.test(file))
      .sort();
    
    console.log(`📁 Found ${migrationFiles.length} migration files`);
    
    // Check which migrations have already been run
    const { data: appliedMigrations, error: queryError } = await supabase
      .from('applied_migrations')
      .select('filename');
      
    if (queryError && !queryError.message.includes('does not exist')) {
      console.error('❌ Failed to query applied migrations:', queryError.message);
      process.exit(1);
    }
    
    const appliedSet = new Set((appliedMigrations || []).map(m => m.filename));
    
    // Run pending migrations
    let migrationsRun = 0;
    for (const file of migrationFiles) {
      if (appliedSet.has(file)) {
        console.log(`⏭️  Skipping ${file} (already applied)`);
        continue;
      }
      
      console.log(`🔄 Applying migration: ${file}`);
      
      const migrationSQL = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      // Run the migration in a transaction
      const { error: migrationError } = await supabase.rpc('run_migration', {
        migration_sql: migrationSQL,
        migration_name: file
      });
      
      if (migrationError) {
        console.error(`❌ Migration ${file} failed:`, migrationError.message);
        process.exit(1);
      }
      
      // Record successful migration
      const { error: recordError } = await supabase
        .from('applied_migrations')
        .insert({
          filename: file,
          applied_at: new Date().toISOString()
        });
        
      if (recordError) {
        console.error(`❌ Failed to record migration ${file}:`, recordError.message);
        process.exit(1);
      }
      
      console.log(`✅ Migration ${file} applied successfully`);
      migrationsRun++;
    }
    
    if (migrationsRun === 0) {
      console.log('✅ No new migrations to apply');
    } else {
      console.log(`\n🎉 Successfully applied ${migrationsRun} migrations!`);
    }
    
    // Verify database health after migrations
    console.log('\n🩺 Verifying database health...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('tenants')
      .select('count')
      .limit(1);
      
    if (healthError) {
      console.error('❌ Post-migration health check failed:', healthError.message);
      process.exit(1);
    }
    
    console.log('✅ Database health check passed');
    
  } catch (error) {
    console.error('❌ Migration runner failed:', error.message);
    process.exit(1);
  }
}

runMigrations().catch(console.error);