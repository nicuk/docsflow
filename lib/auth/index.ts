/**
 * Auth Module Exports
 * 
 * Central export point for all auth-related functionality
 */

// Types
export type { 
  AuthUser, 
  AuthSession, 
  AuthProvider,
  AuthProviderType,
  SignInCredentials,
  SignUpCredentials
} from './types'

// Factory
export {
  getAuthProvider,
  getAuthProviderType,
  isUsingClerk,
  isUsingSupabase,
  resetAuthProvider
} from './auth-factory'

// Providers
export { SupabaseAuthProvider } from './supabase-auth-provider'
