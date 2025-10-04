/**
 * Clear broken ingestion jobs with null document_id
 * Run: npx tsx scripts/clear-broken-jobs.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

async function clearBrokenJobs() {
  console.log('🧹 Clearing broken ingestion jobs...\n');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  // 1. Find jobs with null document_id
  const { data: brokenJobs, error: findError } = await supabase
    .from('ingestion_jobs')
    .select('*')
    .is('document_id', null);
  
  if (findError) {
    console.error('❌ Error finding broken jobs:', findError);
    process.exit(1);
  }
  
  console.log(`📋 Found ${brokenJobs?.length || 0} broken jobs with null document_id:`);
  brokenJobs?.forEach(job => {
    console.log(`   - ${job.id}: ${job.filename} (status: ${job.status})`);
  });
  console.log('');
  
  if (!brokenJobs || brokenJobs.length === 0) {
    console.log('✅ No broken jobs to clean up!');
    return;
  }
  
  // 2. Delete them
  const { error: deleteError } = await supabase
    .from('ingestion_jobs')
    .delete()
    .is('document_id', null);
  
  if (deleteError) {
    console.error('❌ Error deleting broken jobs:', deleteError);
    process.exit(1);
  }
  
  console.log(`✅ Deleted ${brokenJobs.length} broken jobs`);
  console.log('');
  console.log('🎯 Next steps:');
  console.log('   1. Upload a fresh document');
  console.log('   2. It will have a valid document_id');
  console.log('   3. Processing should succeed!');
}

clearBrokenJobs().catch(console.error);

