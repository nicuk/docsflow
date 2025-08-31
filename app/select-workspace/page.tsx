'use client'

import { useEffect } from 'react'

/**
 * SURGICAL REDIRECT PAGE
 * Handles main domain to tenant subdomain redirection
 * Clean separation of concerns - only handles redirects
 */
export default function SelectWorkspacePage() {
  useEffect(() => {
    const redirectToWorkspace = async () => {
      try {
        // Get tenant session
        const { EnterpriseSessionManager } = await import('@/lib/enterprise-session-manager')
        const userSession = EnterpriseSessionManager.getUserSession()
        
        if (userSession?.activeTenants?.length) {
          const firstTenant = userSession.activeTenants[0]
          
          if (firstTenant?.subdomain && firstTenant.subdomain.length > 0) {
            console.log(`🎯 [SELECT-WORKSPACE] Redirecting to: ${firstTenant.subdomain}`)
            window.location.replace(`https://${firstTenant.subdomain}.docsflow.app/dashboard`)
            return
          }
        }
        
        // Check if user is already onboarded via session API
        const sessionResponse = await fetch('/api/auth/session')
        const sessionData = await sessionResponse.json()
        
        if (sessionData.authenticated && sessionData.onboardingComplete && sessionData.tenant?.subdomain) {
          // User is onboarded - redirect to their tenant
          console.log(`✅ [SELECT-WORKSPACE] User onboarded, redirecting to: ${sessionData.tenant.subdomain}`)
          window.location.replace(`https://${sessionData.tenant.subdomain}.docsflow.app/dashboard`)
        } else {
          // No valid tenant found - redirect to onboarding
          console.log(`🔐 [SELECT-WORKSPACE] No valid workspace, redirecting to onboarding`)
          window.location.replace('/onboarding')
        }
        
      } catch (error) {
        console.error('🚨 [SELECT-WORKSPACE] Error:', error)
        // Fallback to onboarding on any error
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
