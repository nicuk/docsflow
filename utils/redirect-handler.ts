/**
 * Centralized redirect logic.
 * Handles redirects with loading states.
 */

export interface RedirectOptions {
  destination: string
  message: string
  delay?: number
}

export class RedirectHandler {
  private static setIsRedirecting?: (isRedirecting: boolean) => void
  private static setRedirectMessage?: (message: string) => void

  static initialize(
    setIsRedirecting: (isRedirecting: boolean) => void,
    setRedirectMessage: (message: string) => void
  ) {
    this.setIsRedirecting = setIsRedirecting
    this.setRedirectMessage = setRedirectMessage
  }

  static async redirectWithLoading({ destination, message, delay = 500 }: RedirectOptions) {
    if (this.setIsRedirecting && this.setRedirectMessage) {
      this.setIsRedirecting(true)
      this.setRedirectMessage(message)
    }

    setTimeout(() => {
      window.location.href = destination
    }, delay)
  }

  // Consolidated onboarding check - single source of truth
  static async checkOnboardingAndRedirect(userData: any): Promise<boolean> {
    if (!userData.onboardingComplete) {
      await this.redirectWithLoading({
        destination: '/onboarding',
        message: 'Completing your setup...'
      })
      return true
    }

    if (!userData.tenant?.id) {
      await this.redirectWithLoading({
        destination: '/onboarding', 
        message: 'Creating your workspace...'
      })
      return true
    }

    return false
  }

  // Main domain tenant redirect
  static async checkTenantRedirect(userData: any): Promise<boolean> {
    const hostname = window.location.hostname
    
    if ((hostname === 'www.docsflow.app' || hostname === 'docsflow.app') && userData.tenant?.subdomain) {
      await this.redirectWithLoading({
        destination: `https://${userData.tenant.subdomain}.docsflow.app/dashboard`,
        message: `Taking you to ${userData.tenant.subdomain}...`,
        delay: 800
      })
      return true
    }

    return false
  }

  // Cookie-based tenant redirect  
  static async checkCookieRedirect(): Promise<boolean> {
    const { MultiTenantCookieManager } = await import('@/lib/multi-tenant-cookie-manager')
    
    const currentTenant = MultiTenantCookieManager.getCurrentTenantSubdomain()
    const tenantContexts = MultiTenantCookieManager.getCurrentTenantContexts()

    if (currentTenant && tenantContexts[currentTenant]) {
      await this.redirectWithLoading({
        destination: `https://${currentTenant}.docsflow.app/dashboard`,
        message: `Redirecting to ${currentTenant}...`
      })
      return true
    }

    // Fallback: use first available tenant context
    if (Object.keys(tenantContexts).length > 0) {
      const firstTenantSubdomain = Object.keys(tenantContexts)[0]
      await this.redirectWithLoading({
        destination: `https://${firstTenantSubdomain}.docsflow.app/dashboard`,
        message: `Connecting to ${firstTenantSubdomain}...`
      })
      return true
    }

    return false
  }
}
