/**
 * Auth Provider Abstraction Types
 * 
 * Allows switching between Clerk and Supabase seamlessly
 * with feature flag: NEXT_PUBLIC_USE_CLERK
 */

export interface AuthUser {
  id: string
  email: string
  name?: string
  role?: string
  tenantId?: string
  metadata?: Record<string, any>
}

export interface AuthSession {
  user: AuthUser
  accessToken: string
  expiresAt?: number
}

export interface SignInCredentials {
  email: string
  password: string
}

export interface SignUpCredentials {
  email: string
  password: string
  name?: string
}

/**
 * Universal Auth Provider Interface
 * Implemented by both Clerk and Supabase adapters
 */
export interface AuthProvider {
  // User Operations
  getCurrentUser(): Promise<AuthUser | null>
  signIn(credentials: SignInCredentials): Promise<AuthUser>
  signUp(credentials: SignUpCredentials): Promise<AuthUser>
  signOut(): Promise<void>
  
  // Session Operations
  getSession(): Promise<AuthSession | null>
  refreshSession(): Promise<AuthSession | null>
  
  // Status Checks
  isAuthenticated(): Promise<boolean>
  
  // Provider Info
  getProviderName(): string
}

export type AuthProviderType = 'clerk' | 'supabase'
