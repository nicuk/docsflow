/**
 * UNIFIED AUTH TYPES
 * Single source of truth for authentication types
 */

export interface AuthToken {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  token_type?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
  access_level?: number;
}

export interface AuthSession {
  user: AuthUser;
  token: AuthToken;
  tenant_id?: string;
  expires_at?: number;
}

export interface AuthValidationResult {
  isValid: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
  statusCode?: number;
}

export interface TenantInfo {
  id: string;
  subdomain: string;
  name: string;
  industry?: string;
  status: 'active' | 'suspended' | 'pending';
}

export interface TenantValidationResult {
  isValid: boolean;
  tenant?: TenantInfo;
  error?: string;
  statusCode?: number;
}

// Auth Service Configuration
export interface AuthServiceConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  enableCaching?: boolean;
  cacheExpiry?: number;
  enableFallback?: boolean;
}

// Legacy compatibility types (for migration period)
export interface LegacyAuthData {
  authenticated: boolean;
  user: AuthUser | null;
  tenant: TenantInfo | null;
  onboardingComplete: boolean;
}
