/**
 * Clerk Auth Provider Implementation
 * 
 * Implements AuthProvider interface using Clerk
 * Used only when NEXT_PUBLIC_USE_CLERK=true
 */

import { currentUser, auth } from '@clerk/nextjs/server'
import type { AuthProvider, AuthUser, AuthSession, SignInCredentials, SignUpCredentials } from './types'

export class ClerkAuthProvider implements AuthProvider {
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const user = await currentUser()
      
      if (!user) {
        return null
      }

      return {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress || '',
        name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : undefined,
        role: user.publicMetadata?.role as string | undefined,
        tenantId: user.publicMetadata?.tenantId as string | undefined,
        metadata: user.publicMetadata
      }
    } catch {
      return null
    }
  }

  async signIn(credentials: SignInCredentials): Promise<AuthUser> {
    // Clerk handles sign-in through UI components
    // This method is for compatibility with the interface
    throw new Error('Sign in must be done through Clerk UI components')
  }

  async signUp(credentials: SignUpCredentials): Promise<AuthUser> {
    // Clerk handles sign-up through UI components
    // This method is for compatibility with the interface
    throw new Error('Sign up must be done through Clerk UI components')
  }

  async signOut(): Promise<void> {
    // Clerk handles sign-out through UI components
    throw new Error('Sign out must be done through Clerk UI components')
  }

  async getSession(): Promise<AuthSession | null> {
    try {
      const { userId, sessionId, getToken } = await auth()
      
      if (!userId || !sessionId) {
        return null
      }

      const user = await this.getCurrentUser()
      if (!user) {
        return null
      }

      const token = await getToken()

      return {
        user,
        accessToken: token || '',
        expiresAt: undefined // Clerk handles expiration internally
      }
    } catch {
      return null
    }
  }

  async refreshSession(): Promise<AuthSession | null> {
    // Clerk handles session refresh automatically
    return this.getSession()
  }

  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser()
    return user !== null
  }

  getProviderName(): string {
    return 'clerk'
  }
}
