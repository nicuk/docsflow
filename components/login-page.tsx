"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import DocsFlowBrand from "@/components/DocsFlowBrand"
import { useDarkMode } from "@/hooks/use-dark-mode"

interface FormData {
  email: string
  password: string
  rememberMe: boolean
}

interface FormErrors {
  email?: string
  password?: string
  general?: string
}

export default function LoginPage() {
  const router = useRouter()
  const { isDarkMode } = useDarkMode() // Initialize dark mode
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    rememberMe: false,
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [message, setMessage] = useState('')

  // Handle session bridge from main domain
  useEffect(() => {
    const handleSessionBridge = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionBridge = urlParams.get('session_bridge');
      const token = urlParams.get('token');
      
      console.log(`🔍 [SESSION BRIDGE CHECK] sessionBridge=${sessionBridge}, hasToken=${!!token}`);
      
      if (sessionBridge === 'true' && token) {
        console.log('🌉 Processing session bridge from main domain');
        console.log(`🔍 [SESSION BRIDGE] Token length: ${token.length}`);
        console.log(`🔍 [SESSION BRIDGE] Current URL: ${window.location.href}`);
        
        setIsSuccess(true);
        setMessage('Welcome back! You\'ve been successfully signed in. Redirecting to your dashboard...');
        
        try {
          // ARCHITECTURAL ROOT FIX: Set cookies that MIDDLEWARE expects
          const decodedToken = decodeURIComponent(token);
          console.log(`🔍 [SESSION BRIDGE] Decoded token length: ${decodedToken.length}`);
          console.log(`🔍 [SESSION BRIDGE] Token preview: ${decodedToken.substring(0, 50)}...`);
          
          // CRITICAL: Set the cookies that middleware.ts:204 expects for authentication
          document.cookie = `access_token=${decodedToken}; path=/; domain=.docsflow.app; secure; samesite=lax; max-age=3600`;
          console.log(`✅ [SESSION BRIDGE] Set access_token cookie`);
          
          // Also set Supabase default cookie for session API compatibility
          document.cookie = `sb-lhcopwwiqwjpzbdnjovo-auth-token=${decodedToken}; path=/; domain=.docsflow.app; secure; samesite=lax; max-age=3600`;
          console.log(`✅ [SESSION BRIDGE] Set Supabase auth cookie`);
          
          // DEBUGGING: Verify cookies were actually set
          setTimeout(() => {
            const allCookies = document.cookie;
            console.log(`🔍 [SESSION BRIDGE] Current cookies: ${allCookies.substring(0, 200)}...`);
            console.log(`🔍 [SESSION BRIDGE] access_token present: ${allCookies.includes('access_token')}`);
            console.log(`🔍 [SESSION BRIDGE] sb-auth present: ${allCookies.includes('sb-lhcopwwiqwjpzbdnjovo-auth-token')}`);
          }, 100);
          
          // Get current subdomain for tenant context
          const hostname = window.location.hostname;
          const subdomain = hostname.split('.')[0];
          
          console.log(`🔍 [SESSION BRIDGE] Hostname: ${hostname}, Subdomain: ${subdomain}`);
          
          if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
            // ENTERPRISE FIX: Use proper session management instead of localStorage
            const { EnterpriseSessionManager } = await import('@/lib/enterprise-session-manager');
            
            // Set tenant context using enterprise session manager
            // tenantId will be set properly when we get user data from session API
            console.log(`🔍 [SESSION BRIDGE] Setting tenant context for subdomain: ${subdomain}`);
            
            // Clear URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Redirect to dashboard after showing success message
            setTimeout(() => {
              console.log(`🔍 [SESSION BRIDGE] Redirecting to dashboard...`);
              console.log(`🔍 [SESSION BRIDGE] Current URL before redirect: ${window.location.href}`);
              console.log(`🔍 [SESSION BRIDGE] Target URL: ${window.location.origin}/dashboard`);
              
              // ENTERPRISE FIX: Test session state and set proper tenant context
              fetch('/api/auth/session')
                .then(response => response.json())
                .then(async (data) => {
                  console.log(`🔍 [SESSION BRIDGE] Session check before redirect:`, data);
                  
                  if (data.authenticated && data.tenantId) {
                    // Set proper tenant context with UUID
                    const { EnterpriseSessionManager } = await import('@/lib/enterprise-session-manager');
                    EnterpriseSessionManager.setTenantContext(data.tenantId, subdomain);
                    console.log(`✅ [SESSION BRIDGE] Set tenant context: ${subdomain} -> ${data.tenantId.substring(0, 8)}...`);
                  }
                  
                  window.location.href = '/dashboard';
                })
                .catch(error => {
                  console.error(`🚨 [SESSION BRIDGE] Session check failed:`, error);
                  window.location.href = '/dashboard'; // Continue anyway
                });
            }, 2000);
          } else {
            console.error(`🚨 [SESSION BRIDGE] Invalid subdomain: ${subdomain}`);
          }
        } catch (error) {
          console.error(`🚨 [SESSION BRIDGE] Error processing token:`, error);
        }
      }
    };

    handleSessionBridge();
  }, []);

  // Redirect to dashboard after successful login (but NOT for session bridge)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionBridge = urlParams.get('session_bridge');
    
    // Only redirect if success AND not a session bridge (session bridge handles its own redirect)
    if (isSuccess && sessionBridge !== 'true') {
      const timer = setTimeout(() => {
        router.push('/dashboard')
      }, 1500) // Reduced delay
      
      return () => clearTimeout(timer)
    }
  }, [isSuccess, router])

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.email) {
      newErrors.email = "Email is required"
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)
    setErrors({})

    try {
      // FIXED: Use Supabase directly instead of custom API
      const { createSupabaseClient } = await import('@/lib-frontend/supabase')
      const supabase = createSupabaseClient()
      
      // Direct Supabase authentication - this handles session cookies automatically
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      })
      
      if (error) {
        console.error('Supabase auth error:', error)
        
        // Provide more specific error messages
        let errorMessage = "Invalid email or password"
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = "User not found. Please check your email or sign up for a new account."
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = "Please check your email and confirm your account before signing in."
        } else if (error.message.includes('Too many requests')) {
          errorMessage = "Too many login attempts. Please wait a moment and try again."
        }
        
        setErrors({
          general: errorMessage
        })
        return
      }
      
      if (data.user) {
        setIsSuccess(true)
        
        // Check user's onboarding status from database
        const { data: userProfile } = await supabase
          .from('users')
          .select('tenant_id, tenants(subdomain)')
          .eq('id', data.user.id)
          .single()
        
        // Check if user needs to complete onboarding
        if (!userProfile?.tenant_id) {
          setTimeout(() => {
            router.push('/onboarding')
          }, 1500)
          return
        }
        
        // CRITICAL FIX: Respect login context - don't force tenant redirect from root domain
        const userTenantSubdomain = (userProfile.tenants as any)?.subdomain
        const currentHostname = typeof window !== 'undefined' ? window.location.hostname : ''
        const isRootDomain = currentHostname === 'docsflow.app' || currentHostname === 'localhost'
        
        if (userTenantSubdomain) {
          console.log(`🔐 User belongs to tenant: ${userTenantSubdomain}`)
          
          if (isRootDomain) {
            // SURGICAL FIX: Smooth transition from main domain to tenant
            console.log(`📍 User logged in from main domain - redirecting to tenant with session bridge`)
            
            // Mark that user just logged in to prevent dashboard redirect race condition
            sessionStorage.setItem('just-logged-in', 'true')
            
            setMessage('Login successful! Redirecting to your workspace...')
            
            // Clear any conflicting tenant cookies
            document.cookie = 'tenant-id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
            
            // Create session bridge URL with authentication token
            const bridgeUrl = `https://${userTenantSubdomain}.docsflow.app/login?session_bridge=true&token=${encodeURIComponent(data.session?.access_token || '')}`
            
            console.log(`🔍 [SESSION BRIDGE] Creating redirect to: ${bridgeUrl}`);
            
            setTimeout(() => {
              console.log(`🔍 [SESSION BRIDGE] Executing redirect now...`);
              window.location.href = bridgeUrl
            }, 1500)
          } else {
            // User is on tenant subdomain already
            console.log(`📍 User logged in from tenant subdomain - staying on tenant`)
            setTimeout(() => {
              router.push('/dashboard')
            }, 1500)
          }
        } else {
          // User has no tenant - needs onboarding
          console.log('❌ User has no tenant association, redirecting to onboarding')
          setTimeout(() => {
            router.push('/onboarding')
          }, 1500)
        }
      }
      
    } catch (error) {
      console.error('Login error:', error)
      setErrors({
        general: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    console.log('Google authentication clicked')
    setIsLoading(true)
    
    try {
      // Import auth client
      const { authClient } = await import('@/lib/auth-client')
      
      // Use the real Google OAuth flow
      await authClient.signInWithGoogle()
      
    } catch (error) {
      console.error('Google OAuth error:', error)
      setErrors({
        general: 'Failed to sign in with Google. Please try again.'
      })
      setIsLoading(false)
    }
  }


  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  if (isSuccess) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Welcome back!</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              You've been successfully signed in. Redirecting to your dashboard...
            </p>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <DocsFlowBrand size="sm" variant="horizontal" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sign in to DocsFlow</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Welcome back! Please enter your details.</p>
        </div>


        {/* Google Auth Only */}
        <Button
          variant="outline"
          className="w-full h-11 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 bg-transparent text-sm"
          onClick={handleGoogleAuth}
          disabled={isLoading}
        >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 1C5.38 1 1.62 2.09 1.64 3.15C2.09 4.97 1 7.7 1 12C1 16.3 3.47 20.01 7.07 21.82L10.73 18.98C8.13 18.11 5.6 15.7 5.6 12.84C5.6 12.53 5.62 12.22 5.66 11.91L2.18 7.07C1.43 8.55 1 10.22 1 12S1.43 15.45 2.18 16.93L5.84 14.09C5.35 13.43 5.06 12.66 5.06 11.84C5.06 9.3 7.3 7.06 9.84 7.06C10.66 7.06 11.43 7.35 12.09 7.84L15.53 4.4C14.97 2.09 12.97 1 12 1Z"
            />
          </svg>
          Continue with Google
        </Button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-slate-50 dark:bg-slate-950 text-gray-500 dark:text-gray-400">
              Or continue with email
            </span>
          </div>
        </div>

        {/* Login Form */}
        <Card>
          <CardContent className="pt-4">
            {errors.general && (
              <Alert className="mb-4 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="text-red-700 dark:text-red-300 text-sm">{errors.general}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Email address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className={`pl-9 h-10 text-sm ${errors.email ? "border-red-500 focus:border-red-500" : ""}`}
                    placeholder="demo@example.com"
                    autoComplete="email"
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-600 dark:text-red-400 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="password" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className={`pl-9 pr-9 h-10 text-sm ${errors.password ? "border-red-500 focus:border-red-500" : ""}`}
                    placeholder="password"
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-600 dark:text-red-400 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.password}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={formData.rememberMe}
                    onCheckedChange={(checked) => handleInputChange("rememberMe", checked as boolean)}
                  />
                  <Label htmlFor="remember" className="text-xs text-gray-600 dark:text-gray-300">
                    Remember me
                  </Label>
                </div>
                <Link
                  href="/forgot-password"
                  className="text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Sign up link */}
        <p className="text-center text-xs text-gray-600 dark:text-gray-300">
          Don't have an account?{" "}
          <Link
            href="/signup"
            className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          >
            Sign up
          </Link>
        </p>

        {/* Security notice */}
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            🔒 Your data is protected with enterprise-grade security
          </p>
        </div>
      </div>
    </div>
  )
}
