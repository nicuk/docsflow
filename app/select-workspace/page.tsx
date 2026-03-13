'use client'

import { useEffect } from 'react'

/**
 * Workspace selection / redirect page.
 * Handles main domain to tenant subdomain redirection.
 */
export default function SelectWorkspacePage() {
  useEffect(() => {
    const redirectToWorkspace = async () => {
      try {
        // Get tenant session using unified cookie manager
        const { MultiTenantCookieManager } = await import('@/lib/multi-tenant-cookie-manager')
        const tenantContexts = MultiTenantCookieManager.getCurrentTenantContexts()
        const currentTenant = MultiTenantCookieManager.getCurrentTenantSubdomain()
        
        if (currentTenant && tenantContexts[currentTenant]) {
          window.location.replace(`https://${currentTenant}.docsflow.app/dashboard`)
          return
        } else if (Object.keys(tenantContexts).length > 0) {
          const firstTenantSubdomain = Object.keys(tenantContexts)[0]
          window.location.replace(`https://${firstTenantSubdomain}.docsflow.app/dashboard`)
          return
        }
        
        // Check if user is already onboarded via session API
        const sessionResponse = await fetch('/api/auth/session')
        const sessionData = await sessionResponse.json()
        
        if (sessionData.authenticated && sessionData.onboardingComplete && sessionData.tenant?.subdomain) {
          window.location.replace(`https://${sessionData.tenant.subdomain}.docsflow.app/dashboard`)
        } else {
          window.location.replace('/onboarding')
        }
        
      } catch (error) {
        window.location.replace('/onboarding')
      }
    }

    // Execute redirect immediately
    redirectToWorkspace()
  }, [])

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Connecting to your workspace...
        </h2>
        <p className="text-gray-600">
          Please wait while we redirect you to your team's workspace.
        </p>
      </div>
    </div>
  )
}
