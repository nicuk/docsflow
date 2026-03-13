"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSignUp } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import DocsFlowBrand from "@/components/DocsFlowBrand"

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signUp, isLoaded, setActive } = useSignUp()
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const email = searchParams.get("email") || ""

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isLoaded || !signUp) return

    setIsLoading(true)
    setError("")

    try {
      // Attempt email verification
      const result = await signUp.attemptEmailAddressVerification({
        code,
      })

      if (result.status === "complete") {
        // Set the active session
        await setActive({ session: result.createdSessionId })
        
        router.push('/onboarding')
      } else {
        setError("Verification failed. Please check your code and try again.")
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Invalid verification code")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (!isLoaded || !signUp) return

    setIsLoading(true)
    setError("")

    try {
      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      })
      
      alert("Verification code resent! Check your email.")
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Failed to resend code")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <DocsFlowBrand size="sm" variant="horizontal" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Verify your email</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            We sent a verification code to <strong>{email}</strong>
          </p>
        </div>

        {/* Verification Form */}
        <Card>
          <CardContent className="pt-4">
            {error && (
              <Alert className="mb-4 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="text-red-700 dark:text-red-300 text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Verification Code
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="pl-9 h-11 text-center text-lg tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                    autoComplete="one-time-code"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Enter the 6-digit code from your email
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                disabled={isLoading || code.length !== 6}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Verify Email
                  </>
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Button
                variant="ghost"
                onClick={handleResendCode}
                disabled={isLoading}
                className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                Didn't receive the code? Resend
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help text */}
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Check your spam folder if you don't see the email
          </p>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}

