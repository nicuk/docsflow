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
        return null;
      }

      // 1. Check memory cache first (0ms - no I/O)
      const cached = this.cache.get(subdomain);
      if (cached && cached.expires > Date.now()) {
        if (!cached.data?.uuid || !cached.data?.subdomain) {
          this.cache.delete(subdomain);
        } else {
          return cached.data;
        }
      }
      
      // 2. Check Redis with proper error handling (5-10ms)
      try {
        const redisKey = `tenant:subdomain:${subdomain}`;
        const redisData = await redis?.get(redisKey);
        if (redisData) {
          // Handle Upstash Redis auto-parsing
          let parsed;
          if (typeof redisData === 'string') {
            parsed = JSON.parse(redisData);
          } else if (typeof redisData === 'object' && redisData !== null) {
            // Upstash Redis already parsed the JSON
            parsed = redisData;
          } else {
            await redis?.del(redisKey);
            throw new Error('Invalid cache data type');
          }
          
          // Validate parsed data structure
          if (!parsed.id || !parsed.subdomain) {
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
      } catch (_) {
        /* expected: Redis unavailable, falling back to DB */
      }
      
      // 3. Database fallback with proper caching (50-100ms - only when needed)
      
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
        return null;
      }
      
      if (!data) {
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
      } catch (_) {
        /* non-critical: failed to cache in Redis, memory cache still valid */
      }
      
      return tenantData;
      
    } catch (error) {
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
      } catch (_) {
        /* expected: Redis unavailable for UUID lookup, falling back to DB */
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
      } catch (_) {
        /* non-critical: failed to cache UUID lookup in Redis */
      }

      return tenantData;

    } catch (error) {
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
    } catch (_error) {
      console.error('Failed to clear tenant cache:', _error);
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
      return null;
    }
  }
}