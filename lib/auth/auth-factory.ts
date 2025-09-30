/**
 * Auth Provider Factory
 * 
 * Creates the appropriate auth provider based on feature flag
 * NEXT_PUBLIC_USE_CLERK=true → Clerk
 * NEXT_PUBLIC_USE_CLERK=false → Supabase (default)
 */

import type { AuthProvider, AuthProviderType } from './types'
import { SupabaseAuthProvider } from './supabase-auth-provider'
import { ClerkAuthProvider } from './clerk-auth-provider'

// Singleton instances
let authProviderInstance: AuthProvider | null = null

/**
 * Get the current auth provider based on environment configuration
 */
export function getAuthProvider(): AuthProvider {
  if (authProviderInstance) {
    return authProviderInstance
  }

  const useClerk = process.env.NEXT_PUBLIC_USE_CLERK === 'true'
  
  if (useClerk) {
    // Clerk implementation ready for testing
    authProviderInstance = new ClerkAuthProvider()
    console.log(`[AuthFactory] Using Clerk auth provider`)
  } else {
    // Default to Supabase (existing working implementation)
    authProviderInstance = new SupabaseAuthProvider()
    console.log(`[AuthFactory] Using Supabase auth provider`)
  }
  
  return authProviderInstance
}

/**
 * Get the current provider type
 */
export function getAuthProviderType(): AuthProviderType {
  return process.env.NEXT_PUBLIC_USE_CLERK === 'true' ? 'clerk' : 'supabase'
}

/**
 * Check if using Clerk
 */
export function isUsingClerk(): boolean {
  return process.env.NEXT_PUBLIC_USE_CLERK === 'true'
}

/**
 * Check if using Supabase
 */
export function isUsingSupabase(): boolean {
  return !isUsingClerk()
}

/**
 * Reset the provider instance (useful for testing)
 */
export function resetAuthProvider(): void {
  authProviderInstance = null
}
