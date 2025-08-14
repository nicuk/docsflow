// Sync bitto tenant from Supabase to Redis (CommonJS version)
// This ensures the middleware can find the tenant

const { createClient } = require('@supabase/supabase-js');
const { Redis } = require('@upstash/redis');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.log('Available env vars:', {
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  });
  process.exit(1);
}

console.log('🔧 Using Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Redis
const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

if (!redisUrl || !redisToken) {
  console.error('❌ Missing Redis credentials');
  console.log('Available env vars:', {
    hasKvUrl: !!process.env.KV_REST_API_URL,
    hasUpstashUrl: !!process.env.UPSTASH_REDIS_REST_URL,
    hasKvToken: !!process.env.KV_REST_API_TOKEN,
    hasUpstashToken: !!process.env.UPSTASH_REDIS_REST_TOKEN
  });
  process.exit(1);
}

const redis = new Redis({
  url: redisUrl,
  token: redisToken,
});

async function syncTenantToRedis() {
  try {
    console.log('🔍 Fetching bitto tenant from Supabase...');
    
    // Get the tenant from Supabase
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('subdomain', 'bitto')
      .single();
    
    if (error) {
      console.error('❌ Error fetching tenant:', error);
      return;
    }
    
    if (!tenant) {
      console.error('❌ Tenant "bitto" not found in database');
      return;
    }
    
    console.log('✅ Found tenant:', {
      id: tenant.id,
      subdomain: tenant.subdomain,
      name: tenant.name,
      industry: tenant.industry
    });
    
    // Store in Redis with the correct key format
    const redisKey = `tenant:${tenant.subdomain}`;
    const tenantData = {
      id: tenant.id,
      subdomain: tenant.subdomain,
      name: tenant.name,
      industry: tenant.industry,
      exists: true,
      cached_at: new Date().toISOString()
    };
    
    console.log('📝 Storing in Redis with key:', redisKey);
    await redis.set(redisKey, JSON.stringify(tenantData), {
      ex: 3600 // Cache for 1 hour
    });
    
    // Verify it was stored
    const cached = await redis.get(redisKey);
    if (cached) {
      console.log('✅ Successfully cached tenant in Redis');
      console.log('📊 Cached data:', JSON.parse(cached));
    } else {
      console.error('❌ Failed to verify Redis cache');
    }
    
    // Also set a simple existence flag
    await redis.set(`tenant:exists:${tenant.subdomain}`, 'true', {
      ex: 3600
    });
    
    console.log('🎉 Sync complete! The middleware should now recognize the bitto tenant.');
    console.log('');
    console.log('🚀 Next steps:');
    console.log('1. Visit https://bitto.docsflow.app');
    console.log('2. You should be redirected to the login page (not onboarding)');
    console.log('3. Login with your credentials');
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    console.error('Details:', error.message);
  }
}

// Run the sync
syncTenantToRedis();
