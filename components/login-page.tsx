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
  const [tenantContext, setTenantContext] = useState<{name?: string, subdomain?: string} | null>(null)
  const [hasSAMLEnabled, setHasSAMLEnabled] = useState(false)
  const [isSAMLLoading, setIsSAMLLoading] = useState(false)

  // Detect if user has tenant context but no auth tokens
  useEffect(() => {
    const detectTenantContext = async () => {
      // Check if we're on a tenant subdomain
      const hostname = window.location.hostname
      const subdomain = hostname.split('.')[0]
      
      if (hostname.includes('.docsflow.app') && subdomain !== 'www' && subdomain !== 'api') {
        // Check if user has tenant context cookies but no auth tokens
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=')
          acc[key] = value
          return acc
        }, {} as Record<string, string>)
        
        const tenantContexts = cookies['tenant-contexts']
        const authToken = cookies['access_token']
        const userEmail = cookies['user_email']
        
        if (tenantContexts && !authToken) {
          // User has tenant context but no auth - they were logged out
          try {
            const contexts = JSON.parse(tenantContexts)
            if (contexts[subdomain]) {
              setTenantContext({ subdomain })
              setMessage(`Welcome back! Please sign in to access your ${subdomain} workspace.`)
              
              // Pre-populate email if available
              if (userEmail) {
                setFormData(prev => ({ ...prev, email: userEmail }))
              }
              
              // Check if SAML is enabled for this tenant
              checkSAMLAvailability(subdomain)
            }
          } catch (e) {
            console.warn('Failed to parse tenant contexts:', e)
          }
        } else if (subdomain && subdomain !== 'localhost') {
          // Direct access to tenant subdomain
          setTenantContext({ subdomain })
          checkSAMLAvailability(subdomain)
        }
      }
    }
    
    detectTenantContext()
  }, [])

  // Check if SAML is available for the current tenant
  const checkSAMLAvailability = async (subdomain: string) => {
    try {
      // FEATURE FLAG: Disable SAML in production until freemium is complete
      const isDevMode = process.env.NODE_ENV === 'development';
      const samlEnabled = process.env.NEXT_PUBLIC_ENABLE_SAML === 'true';
      
      if (!isDevMode && !samlEnabled) {
        setHasSAMLEnabled(false);
        return;
      }
      
      // Get tenant ID from subdomain first
      const tenantResponse = await fetch(`/api/company/${subdomain}`)
      if (!tenantResponse.ok) return
      
      const tenantData = await tenantResponse.json()
      if (!tenantData.tenant?.id) return
      
      // Check SAML configuration
      const samlResponse = await fetch(`/api/tenants/${tenantData.tenant.id}/saml`)
      if (samlResponse.ok) {
        const samlData = await samlResponse.json()
        setHasSAMLEnabled(samlData.samlConfig?.is_enabled === true)
      }
    } catch (error) {
      console.error('Error checking SAML availability:', error)
    }
  }

  // Handle SAML login
  const handleSAMLLogin = async () => {
    if (!tenantContext?.subdomain) return
    
    setIsSAMLLoading(true)
    try {
      // Get tenant ID from subdomain
      const tenantResponse = await fetch(`/api/company/${tenantContext.subdomain}`)
      if (!tenantResponse.ok) {
        throw new Error('Failed to get tenant information')
      }
      
      const tenantData = await tenantResponse.json()
      if (!tenantData.tenant?.id) {
        throw new Error('Tenant not found')
      }
      
      // Redirect to SAML login endpoint
      const relayState = encodeURIComponent(window.location.pathname + window.location.search)
      window.location.href = `/api/auth/saml/login/${tenantData.tenant.id}?RelayState=${relayState}`
    } catch (error) {
      console.error('SAML login error:', error)
      setErrors({ general: 'Failed to initiate SAML login. Please try again.' })
    } finally {
      setIsSAMLLoading(false)
    }
  }

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
          
          // MULTI-TENANT: Use unified cookie management system
          const { MultiTenantCookieManager } = await import('@/lib/multi-tenant-cookie-manager');
          MultiTenantCookieManager.clearAuthTokensOnly();
          
          // Set unified auth tokens (primary + fallback) manually since this is session bridge
          document.cookie = `docsflow_auth_token=${decodedToken}; path=/; domain=.docsflow.app; secure; samesite=lax; max-age=3600`;
          document.cookie = `sb-lhcopwwiqwjpzbdnjovo-auth-token=${decodedToken}; path=/; domain=.docsflow.app; secure; samesite=lax; max-age=3600`;
          document.cookie = `access_token=${decodedToken}; path=/; domain=.docsflow.app; secure; samesite=lax; max-age=3600`;
          console.log(`✅ [SESSION BRIDGE] Set multi-tenant compatible auth cookies`);
          
          // DEBUGGING: Verify cookies were actually set
          setTimeout(() => {
            const allCookies = document.cookie;
            console.log(`🔍 [SESSION BRIDGE] Current cookies: ${allCookies.substring(0, 200)}...`);
            console.log(`🔍 [SESSION BRIDGE] docsflow_auth_token present: ${allCookies.includes('docsflow_auth_token')}`);
            console.log(`🔍 [SESSION BRIDGE] sb-auth present: ${allCookies.includes('sb-lhcopwwiqwjpzbdnjovo-auth-token')}`);
          }, 100);
          
          // Get current subdomain for tenant context
          const hostname = window.location.hostname;
          const subdomain = hostname.split('.')[0];
          
          console.log(`🔍 [SESSION BRIDGE] Hostname: ${hostname}, Subdomain: ${subdomain}`);
          
          if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
            // UNIFIED FIX: Tenant context will be set by session API response
            // MultiTenantCookieManager will handle the tenant context properly
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
                  // ENTERPRISE: Use multi-tenant cookie manager (ONLY - no conflicts)
                  const { MultiTenantCookieManager } = await import('@/lib/multi-tenant-cookie-manager');
                  
                  MultiTenantCookieManager.addTenantContext(
                    {
                      tenantId: data.tenantId,
                      subdomain: subdomain,
                      userEmail: data.user.email
                    },
                    {
                      accessToken: decodedToken,
                      refreshToken: undefined
                    }
                  );
                  
                  console.log(`✅ [SESSION BRIDGE] Set schema-aligned tenant context: ${subdomain} -> ${data.tenantId.substring(0, 8)}...`);
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
    console.log('🚀 [LOGIN-DEBUG] Submit started');

    if (!validateForm()) {
      console.log('❌ [LOGIN-DEBUG] Form validation failed');
      return;
    }

    console.log('✅ [LOGIN-DEBUG] Form validated, setting loading state');
    setIsLoading(true)
    setErrors({})

    // FAILSAFE: Auto-recover from hanging state after 15 seconds
    const hangingFailsafe = setTimeout(() => {
      console.error('🚨 [LOGIN-DEBUG] FAILSAFE TRIGGERED - Login hanging for 15s, auto-recovering');
      setIsLoading(false);
      setErrors({ general: 'Login timed out. Please try again. If this persists, check your connection.' });
    }, 15000);

    try {
      console.log('🔄 [LOGIN-DEBUG] Importing Supabase client...');
      
      // SURGICAL FIX: Create clean Supabase client to avoid conflicts
      let supabase;
      try {
        const { createClient } = await import('@supabase/supabase-js');
        supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            auth: {
              autoRefreshToken: true,
              persistSession: true,
              detectSessionInUrl: false // Prevent conflicts with session bridge
            }
          }
        );
        console.log('✅ [LOGIN-DEBUG] Clean Supabase client created');
      } catch (clientError) {
        console.error('🚨 [LOGIN-DEBUG] Failed to create Supabase client:', clientError);
        setErrors({
          general: 'Authentication system unavailable. Please try again.'
        });
        return;
      }
      
      console.log('🔐 [LOGIN-DEBUG] Attempting authentication...');
      
      // SURGICAL FIX: Add timeout to prevent hanging Supabase auth
      let authResult;
      try {
        authResult = await Promise.race([
          supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Supabase auth timeout')), 10000)
          )
        ]);
        
        console.log('🔍 [LOGIN-DEBUG] Auth response received:', { 
          hasData: !!authResult.data, 
          hasError: !!authResult.error, 
          userId: authResult.data?.user?.id 
        });
      } catch (authTimeout) {
        console.error('🚨 [LOGIN-DEBUG] Supabase auth timed out or failed:', authTimeout);
        setErrors({
          general: 'Authentication service is taking too long. Please try again in a moment.'
        });
        return;
      }
      
      const { data, error } = authResult;
      
      if (error) {
        console.error('Supabase auth error:', error)
        
        // SIMPLE FIX: Better error message mapping
        let errorMessage = "Invalid email or password"
        
        if (error.message.includes('Invalid login credentials')) {
          // Check if user exists to provide more specific error
          try {
            const { data: userExists } = await supabase
              .from('users')
              .select('email')
              .eq('email', formData.email)
              .single();
            
            if (userExists) {
              errorMessage = "Incorrect password. Please check your password and try again."
            } else {
              errorMessage = "No account found with this email address. Please check your email or sign up for a new account."
            }
          } catch (checkError) {
            // If we can't check, fall back to generic message
            errorMessage = "Invalid email or password. Please check your credentials and try again."
          }
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = "Please check your email and confirm your account before signing in."
        } else if (error.message.includes('Too many requests')) {
          errorMessage = "Too many login attempts. Please wait a moment and try again."
        } else if (error.message.includes('User not found')) {
          errorMessage = "No account found with this email address. Please check your email or sign up for a new account."
        }
        
        setErrors({
          general: errorMessage
        })
        return
      }
      
      if (data.user) {
        console.log('✅ [LOGIN-DEBUG] Authentication successful, user found');
        setIsSuccess(true)
        
        console.log('🔄 [LOGIN-DEBUG] Fetching user profile from database...');
        
        // SURGICAL FIX: Add timeout and error handling to hanging database query
        let userProfile = null;
        try {
          console.log('🔍 [LOGIN-DEBUG] Executing users table query...');
          const profileResult = await Promise.race([
            supabase
              .from('users')
              .select('tenant_id, tenants(subdomain)')
              .eq('id', data.user.id)
              .single(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Database query timeout')), 8000)
            )
          ]);
          
          userProfile = profileResult.data;
          console.log('🔍 [LOGIN-DEBUG] User profile fetched successfully:', { 
            hasProfile: !!userProfile, 
            hasTenantId: !!userProfile?.tenant_id,
            tenantSubdomain: userProfile?.tenants?.subdomain 
          });
        } catch (dbError) {
          console.error('🚨 [LOGIN-DEBUG] Database query failed or timed out:', dbError);
          
          // FALLBACK: Try simple query without join
          console.log('🔄 [LOGIN-DEBUG] Attempting fallback query without join...');
          try {
            const simpleResult = await supabase
              .from('users')
              .select('tenant_id')
              .eq('id', data.user.id)
              .single();
            
            if (simpleResult.data?.tenant_id) {
              console.log('✅ [LOGIN-DEBUG] Fallback query successful, fetching tenant separately...');
              const tenantResult = await supabase
                .from('tenants')
                .select('subdomain')
                .eq('id', simpleResult.data.tenant_id)
                .single();
              
              userProfile = {
                tenant_id: simpleResult.data.tenant_id,
                tenants: { subdomain: tenantResult.data?.subdomain }
              };
              console.log('✅ [LOGIN-DEBUG] Fallback complete:', userProfile);
            }
          } catch (fallbackError) {
            console.error('🚨 [LOGIN-DEBUG] Fallback query also failed:', fallbackError);
            // Continue without profile - will redirect to onboarding
          }
        }
        
        // Check if user needs to complete onboarding
        if (!userProfile?.tenant_id) {
          console.log('🚪 [LOGIN-DEBUG] User needs onboarding, redirecting...');
          setTimeout(() => {
            router.push('/onboarding')
          }, 1500)
          return
        }
        
        console.log('🔄 [LOGIN-DEBUG] Processing tenant redirect logic...');
        // CRITICAL FIX: Respect login context - don't force tenant redirect from root domain
        const userTenantSubdomain = (userProfile.tenants as any)?.subdomain
        const currentHostname = typeof window !== 'undefined' ? window.location.hostname : ''
        const isRootDomain = currentHostname === 'docsflow.app' || currentHostname === 'localhost'
        
        console.log('🔍 [LOGIN-DEBUG] Redirect context:', {
          userTenantSubdomain,
          currentHostname,
          isRootDomain
        });
        
        if (userTenantSubdomain) {
          console.log(`🔐 [LOGIN-DEBUG] User belongs to tenant: ${userTenantSubdomain}`)
          
          if (isRootDomain) {
            console.log('🎯 [LOGIN-DEBUG] Root domain login detected - initiating redirect sequence');
            // SURGICAL FIX: Smooth transition from main domain to tenant
            console.log(`📍 User logged in from main domain - redirecting to tenant with session bridge`)
            
            // Mark that user just logged in to prevent dashboard redirect race condition
            sessionStorage.setItem('just-logged-in', 'true')
            
            setMessage('Login successful! Redirecting to your workspace...')
            
            // Clear any conflicting tenant cookies
            document.cookie = 'tenant-id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
            
            // ENTERPRISE UX: Use elegant transition page instead of direct redirect
            console.log(`🔍 [SMOOTH TRANSITION] Redirecting via transition page for better UX`);
            
            console.log('⏰ [LOGIN-DEBUG] Setting 1.5s timeout for auth-redirect...');
            setTimeout(() => {
              console.log('🚀 [LOGIN-DEBUG] Timeout fired, redirecting to /auth-redirect');
              window.location.href = '/auth-redirect'
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
      console.error('🚨 [LOGIN-DEBUG] Catch block triggered:', error)
      console.error('🚨 [LOGIN-DEBUG] Error type:', typeof error)
      console.error('🚨 [LOGIN-DEBUG] Error message:', error instanceof Error ? error.message : String(error))
      setErrors({
        general: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
      })
    } finally {
      console.log('🏁 [LOGIN-DEBUG] Finally block - clearing loading state and failsafe');
      clearTimeout(hangingFailsafe); // Clear the failsafe since we completed
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
              
              {/* SAML SSO Button */}
              {hasSAMLEnabled && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-300 dark:border-gray-600" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white dark:bg-gray-900 px-2 text-gray-500 dark:text-gray-400">
                        Or
                      </span>
                    </div>
                  </div>
                  
                  <Button
                    type="button"
                    onClick={handleSAMLLogin}
                    className="w-full h-10 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold text-sm"
                    disabled={isSAMLLoading || isLoading}
                  >
                    {isSAMLLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Redirecting...
                      </>
                    ) : (
                      <>
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        Sign in with SSO
                      </>
                    )}
                  </Button>
                </>
              )}
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
