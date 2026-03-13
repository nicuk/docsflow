/**
 * UNIFIED TENANT SERVICE
 * Single source of truth for tenant validation and management
 */

import { createClient } from '@/lib/supabase-browser';
import type { TenantInfo, TenantValidationResult } from '@/lib/types/auth.types';

export class TenantService {
  private static cache = new Map<string, TenantInfo>();
  private static cacheExpiry = 5 * 60 * 1000; // 5 minutes
  private static lastCacheUpdate = 0;

  /**
   * SINGLE METHOD: Validate tenant by subdomain
   */
  static async validateTenant(subdomain: string): Promise<TenantValidationResult> {
    try {
      // Validate input
      if (!subdomain || typeof subdomain !== 'string') {
        return {
          isValid: false,
          error: 'Invalid subdomain format',
          statusCode: 400
        };
      }

      // Check cache first
      const cached = this.getCachedTenant(subdomain);
      if (cached) {
        return {
          isValid: true,
          tenant: cached
        };
      }

      // Fetch from database
      const supabase = createClient();
      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('id, subdomain, name, industry, status')
        .eq('subdomain', subdomain)
        .single();

      if (error || !tenant) {
        return {
          isValid: false,
          error: 'Tenant not found',
          statusCode: 404
        };
      }

      // Validate tenant status
      if (tenant.status !== 'active') {
        return {
          isValid: false,
          error: 'Tenant not active',
          statusCode: 403
        };
      }

      // Cache successful result
      this.setCachedTenant(subdomain, tenant);

      return {
        isValid: true,
        tenant: tenant
      };

    } catch {
      return {
        isValid: false,
        error: 'Tenant validation failed',
        statusCode: 500
      };
    }
  }

  /**
   * Extract tenant subdomain from hostname
   */
  static extractSubdomain(hostname: string): string | null {
    if (!hostname) return null;

    // Remove port if present
    const cleanHostname = hostname.split(':')[0];

    // Extract subdomain from hostname
    if (cleanHostname.includes('.docsflow.app')) {
      const parts = cleanHostname.split('.');
      if (parts.length >= 3) {
        const subdomain = parts[0];
        // Filter out www, api, and localhost
        if (subdomain && subdomain !== 'www' && subdomain !== 'api' && subdomain !== 'localhost') {
          return subdomain;
        }
      }
    }

    return null;
  }

  /**
   * Get tenant by ID (for API validation)
   */
  static async getTenantById(tenantId: string): Promise<TenantInfo | null> {
    try {
      const supabase = createClient();
      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('id, subdomain, name, industry, status')
        .eq('id', tenantId)
        .single();

      if (error || !tenant) {
        return null;
      }

      return tenant;
    } catch {
      return null;
    }
  }

  /**
   * PRIVATE: Cache management
   */
  private static getCachedTenant(subdomain: string): TenantInfo | null {
    const now = Date.now();
    if (now - this.lastCacheUpdate > this.cacheExpiry) {
      this.cache.clear();
      this.lastCacheUpdate = now;
      return null;
    }

    return this.cache.get(subdomain) || null;
  }

  private static setCachedTenant(subdomain: string, tenant: TenantInfo): void {
    this.cache.set(subdomain, tenant);
    this.lastCacheUpdate = Date.now();
  }

  /**
   * Clear cache (for testing or cache invalidation)
   */
  static clearCache(): void {
    this.cache.clear();
    this.lastCacheUpdate = 0;
  }
}
