/**
 * SURGICAL SOLUTION: Centralized redirect logic only
 * Does ONE thing well - handles redirects with loading states
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

    if (!userData.tenantId) {
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
    const { EnterpriseSessionManager } = await import('@/lib/enterprise-session-manager')
    
    const userSession = EnterpriseSessionManager.getUserSession()
    const tenantContext = EnterpriseSessionManager.getTenantContext()

    if (tenantContext?.subdomain) {
      await this.redirectWithLoading({
        destination: `https://${tenantContext.subdomain}.docsflow.app/dashboard`,
        message: `Redirecting to ${tenantContext.subdomain}...`
      })
      return true
    }

    if (userSession?.activeTenants?.length) {
      const firstTenant = userSession.activeTenants[0]
      if (firstTenant?.subdomain) {
        await this.redirectWithLoading({
          destination: `https://${firstTenant.subdomain}.docsflow.app/dashboard`,
          message: `Connecting to ${firstTenant.subdomain}...`
        })
        return true
      }
    }

    return false
  }
}
