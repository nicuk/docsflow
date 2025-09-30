/**
 * Supabase Auth Provider Implementation
 * 
 * Wraps existing Supabase auth logic in the AuthProvider interface
 * Maintains backward compatibility with existing code
 */

import { createClient } from '@supabase/supabase-js'
import type { AuthProvider, AuthUser, AuthSession, SignInCredentials, SignUpCredentials } from './types'

export class SupabaseAuthProvider implements AuthProvider {
  private supabase

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser()
      
      if (error || !user) {
        return null
      }

      // Fetch user profile from database
      const { data: profile } = await this.supabase
        .from('users')
        .select('id, email, name, role, tenant_id')
        .eq('id', user.id)
        .single()

      if (!profile) {
        return {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name,
          metadata: user.user_metadata
        }
      }

      return {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        tenantId: profile.tenant_id,
        metadata: user.user_metadata
      }
    } catch (error) {
      console.error('[SupabaseAuthProvider] getCurrentUser error:', error)
      return null
    }
  }

  async signIn(credentials: SignInCredentials): Promise<AuthUser> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password
    })

    if (error || !data.user) {
      throw new Error(error?.message || 'Sign in failed')
    }

    const user = await this.getCurrentUser()
    if (!user) {
      throw new Error('Failed to fetch user profile after sign in')
    }

    return user
  }

  async signUp(credentials: SignUpCredentials): Promise<AuthUser> {
    const { data, error } = await this.supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          name: credentials.name
        }
      }
    })

    if (error || !data.user) {
      throw new Error(error?.message || 'Sign up failed')
    }

    return {
      id: data.user.id,
      email: data.user.email || credentials.email,
      name: credentials.name,
      metadata: data.user.user_metadata
    }
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut()
    if (error) {
      throw new Error(error.message)
    }
  }

  async getSession(): Promise<AuthSession | null> {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession()
      
      if (error || !session) {
        return null
      }

      const user = await this.getCurrentUser()
      if (!user) {
        return null
      }

      return {
        user,
        accessToken: session.access_token,
        expiresAt: session.expires_at
      }
    } catch (error) {
      console.error('[SupabaseAuthProvider] getSession error:', error)
      return null
    }
  }

  async refreshSession(): Promise<AuthSession | null> {
    try {
      const { data: { session }, error } = await this.supabase.auth.refreshSession()
      
      if (error || !session) {
        return null
      }

      const user = await this.getCurrentUser()
      if (!user) {
        return null
      }

      return {
        user,
        accessToken: session.access_token,
        expiresAt: session.expires_at
      }
    } catch (error) {
      console.error('[SupabaseAuthProvider] refreshSession error:', error)
      return null
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser()
    return user !== null
  }

  getProviderName(): string {
    return 'supabase'
  }
}
