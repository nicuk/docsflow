"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useClerk } from "@clerk/nextjs"
import { Loader2 } from "lucide-react"
import DocsFlowBrand from "@/components/DocsFlowBrand"

export default function SSOCallbackPage() {
  const router = useRouter()
  const { handleRedirectCallback } = useClerk()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        await handleRedirectCallback({
          afterSignInUrl: '/onboarding',
          afterSignUpUrl: '/onboarding'
        })
        router.push('/onboarding')
      } catch (error) {
        router.push('/login?error=oauth_failed')
      }
    }

    handleCallback()
  }, [handleRedirectCallback, router])

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="flex items-center justify-center mb-4">
          <DocsFlowBrand size="sm" variant="horizontal" />
        </div>
        
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Completing sign in...
        </h2>
        
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Please wait while we set up your account
        </p>
      </div>
    </div>
  )
}

