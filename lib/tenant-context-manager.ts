import { redis } from '@/lib/redis';

// SECURITY FIX: Use secure database service
import { SecureDocumentService, SecureTenantService, SecureUserService } from '@/lib/secure-database';
// Note: Update the function to use SecureDocumentService, SecureTenantService, or SecureUserService methods

export interface TenantData {
  uuid: string;
  subdomain: string;
  name?: string;
}

export class TenantContextManager {
  private static cache = new Map<string, {data: TenantData, expires: number}>();
  
  /**
   * Resolves tenant data from subdomain string
   * Returns both UUID and subdomain for proper context propagation
   */
  static async resolveTenant(subdomain: string): Promise<TenantData | null> {
    try {
      // Validate input - should be subdomain, not UUID
      if (this.isUUID(subdomain)) {
        console.error(`❌ Invalid input: UUID passed as subdomain: ${subdomain}`);
        return null;
      }

      // 1. Check memory cache first (0ms - no I/O)
      const cached = this.cache.get(subdomain);
      if (cached && cached.expires > Date.now()) {
        // CRITICAL FIX: Validate memory cache data structure
        if (!cached.data?.uuid || !cached.data?.subdomain) {
          console.warn(`⚠️ Corrupted memory cache for ${subdomain}, clearing`);
          this.cache.delete(subdomain);
        } else {
          console.log(`✅ Memory cache hit for tenant: ${subdomain}`);
          return cached.data;
        }
      }
      
      // 2. Check Redis with proper error handling (5-10ms)
      try {
        const redisKey = `tenant:subdomain:${subdomain}`;
        const redisData = await redis?.get(redisKey);
        if (redisData) {
          console.log(`✅ Redis tenant cache HIT for: ${subdomain}`);
          
          // Handle Upstash Redis auto-parsing
          let parsed;
          if (typeof redisData === 'string') {
            parsed = JSON.parse(redisData);
          } else if (typeof redisData === 'object' && redisData !== null) {
            // Upstash Redis already parsed the JSON
            parsed = redisData;
          } else {
            console.warn(`⚠️ Invalid Redis data type for ${subdomain}, clearing cache`);
            await redis?.del(redisKey);
            throw new Error('Invalid cache data type');
          }
          
          // Validate parsed data structure
          if (!parsed.id || !parsed.subdomain) {
            console.warn(`⚠️ Invalid Redis data structure for ${subdomain}, clearing cache`);
            await redis?.del(redisKey);
            throw new Error('Invalid cache structure');
          }
          
          const tenantData: TenantData = {
            uuid: parsed.id,
            subdomain: parsed.subdomain,
            name: parsed.name
          };
          
          // Update memory cache
          this.cache.set(subdomain, { 
            data: tenantData, 
            expires: Date.now() + 300000 
          });
          
          return tenantData;
        }
      } catch (redisError) {
        console.warn('⚠️ Redis unavailable, falling back to DB:', redisError);
      }
      
      // 3. Database fallback with proper caching (50-100ms - only when needed)
      console.log(`🔍 Database lookup for tenant: ${subdomain}`);
      
      // Use service role for tenant lookups to bypass RLS
      const { createClient } = await import('@supabase/supabase-js');
      const serviceSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const { data, error } = await serviceSupabase
        .from('tenants')
        .select('id, subdomain, name')
        .eq('subdomain', subdomain)
        .maybeSingle();
        
      if (error) {
        console.error('❌ Database error during tenant lookup:', error);
        return null;
      }
      
      if (!data) {
        console.warn(`❌ Tenant not found in database: ${subdomain}`);
        return null;
      }
      
      const tenantData: TenantData = {
        uuid: data.id,
        subdomain: data.subdomain,
        name: data.name
      };
      
      // Cache in both memory and Redis for future requests
      this.cache.set(subdomain, { 
        data: tenantData, 
        expires: Date.now() + 300000 
      });
      
      try {
        const redisKey = `tenant:subdomain:${subdomain}`;
        await redis?.set(redisKey, JSON.stringify({
          id: data.id,
          subdomain: data.subdomain,
          name: data.name
        }), { ex: 3600 }); // 1 hour Redis cache
      } catch (redisError) {
        console.warn('⚠️ Failed to cache in Redis:', redisError);
      }
      
      console.log(`✅ Database lookup successful for tenant: ${subdomain} -> ${data.id}`);
      return tenantData;
      
    } catch (error) {
      console.error('❌ TenantContextManager.resolveTenant failed:', error);
      return null;
    }
  }

  /**
   * Resolves tenant data from UUID
   * Used when we have UUID but need subdomain context
   */
  static async resolveTenantByUUID(uuid: string): Promise<TenantData | null> {
    try {
      if (!this.isUUID(uuid)) {
        console.error(`❌ Invalid UUID format: ${uuid}`);
        return null;
      }

      // Check Redis cache first
      try {
        const redisKey = `tenant:uuid:${uuid}`;
        const redisData = await redis?.get(redisKey);
        if (redisData) {
          const parsed = JSON.parse(redisData as string);
          return {
            uuid: parsed.id,
            subdomain: parsed.subdomain,
            name: parsed.name
          };
        }
      } catch (redisError) {
        console.warn('⚠️ Redis unavailable for UUID lookup:', redisError);
      }

      // Database lookup with service role
      const { createClient } = await import('@supabase/supabase-js');
      const serviceSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const { data, error } = await serviceSupabase
        .from('tenants')
        .select('id, subdomain, name')
        .eq('id', uuid)
        .maybeSingle();

      if (error || !data) {
        console.error(`❌ Tenant UUID not found: ${uuid}`, error);
        return null;
      }

      const tenantData: TenantData = {
        uuid: data.id,
        subdomain: data.subdomain,
        name: data.name
      };

      // Cache the result
      try {
        await redis?.set(`tenant:uuid:${uuid}`, JSON.stringify({
          id: data.id,
          subdomain: data.subdomain,
          name: data.name
        }), { ex: 3600 });
      } catch (redisError) {
        console.warn('⚠️ Failed to cache UUID lookup:', redisError);
      }

      return tenantData;

    } catch (error) {
      console.error('❌ TenantContextManager.resolveTenantByUUID failed:', error);
      return null;
    }
  }

  /**
   * Clear cache for a tenant (useful during updates)
   */
  static async clearTenantCache(subdomain: string, uuid?: string): Promise<void> {
    // Clear memory cache
    this.cache.delete(subdomain);
    
    // Clear Redis cache
    try {
      await redis?.del(`tenant:subdomain:${subdomain}`);
      if (uuid) {
        await redis?.del(`tenant:uuid:${uuid}`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to clear tenant cache:', error);
    }
  }

  /**
   * Check if string is a valid UUID format
   */
  private static isUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  /**
   * Extract subdomain from hostname
   */
  static extractSubdomain(hostname: string): string | null {
    try {
      // Handle localhost development
      if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
        const parts = hostname.split('.');
        if (parts.length > 1 && parts[0] !== 'www') {
          return parts[0];
        }
        return null;
      }

      // Handle production domains
      const parts = hostname.split('.');
      if (parts.length >= 3 && parts[0] !== 'www') {
        return parts[0];
      }
      
      return null;
    } catch (error) {
      console.error('❌ Failed to extract subdomain from hostname:', hostname, error);
      return null;
    }
  }
}