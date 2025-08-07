"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Eye, EyeOff, Mail, Lock, Building, AlertCircle, CheckCircle, Loader2, Check, X } from "lucide-react"
import DocsFlowBrand from "@/components/DocsFlowBrand"

interface FormData {
  companyName: string
  email: string
  password: string
  confirmPassword: string
  agreeToTerms: boolean
  agreeToPrivacy: boolean
}

interface FormErrors {
  companyName?: string
  email?: string
  password?: string
  confirmPassword?: string
  terms?: string
  general?: string
}

interface PasswordStrength {
  score: number
  feedback: string[]
  color: string
}

export default function SignupPage() {
  const [formData, setFormData] = useState<FormData>({
    companyName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
    agreeToPrivacy: false,
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const calculatePasswordStrength = (password: string): PasswordStrength => {
    let score = 0
    const feedback: string[] = []

    if (password.length >= 8) {
      score += 25
    } else {
      feedback.push("8+ chars")
    }

    if (/[A-Z]/.test(password)) {
      score += 25
    } else {
      feedback.push("Uppercase")
    }

    if (/[a-z]/.test(password)) {
      score += 25
    } else {
      feedback.push("Lowercase")
    }

    if (/\d/.test(password)) {
      score += 25
    } else {
      feedback.push("Number")
    }

    let color = "bg-red-500"
    if (score >= 75) color = "bg-green-500"
    else if (score >= 50) color = "bg-yellow-500"
    else if (score >= 25) color = "bg-orange-500"

    return { score, feedback, color }
  }

  const passwordStrength = calculatePasswordStrength(formData.password)

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.companyName.trim()) {
      newErrors.companyName = "Company name is required"
    }

    if (!formData.email) {
      newErrors.email = "Email is required"
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (passwordStrength.score < 75) {
      newErrors.password = "Please create a stronger password"
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password"
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    if (!formData.agreeToTerms || !formData.agreeToPrivacy) {
      newErrors.terms = "Please agree to the terms and privacy policy"
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
      // Use the auth client to register the user with company data
      const { authClient } = await import('@/lib/auth-client');
      const result = await authClient.register(
        formData.email, 
        formData.password, 
        formData.companyName, // Pass company name
        3
      );

      // Store user data and token for session
      localStorage.setItem('user-session', JSON.stringify({
        user: result.user,
        token: result.user.access_token,
        timestamp: new Date().toISOString()
      }));
      
      // Generate subdomain suggestion from company name
      const suggestedSubdomain = generateSubdomainFromCompany(formData.companyName);
      
      // Check if subdomain already exists
      const subdomainExists = await checkSubdomainExists(suggestedSubdomain);
      
      if (subdomainExists) {
        // Subdomain exists - trigger invitation flow
        localStorage.setItem('invitation-request', JSON.stringify({
          companyName: formData.companyName,
          suggestedSubdomain,
          userEmail: formData.email,
          requestType: 'join_existing'
        }));
        
        // Redirect to invitation request page
        window.location.href = `/invite-request?subdomain=${suggestedSubdomain}`;
        return;
      }
      
      // Subdomain doesn't exist - proceed with onboarding
      const tenantContext = {
        subdomain: suggestedSubdomain,
        organizationName: formData.companyName,
        industry: 'general', // Will be determined in onboarding
        tenantId: result.user.tenant?.id,
        accessLevel: 1, // First user gets admin (level 1)
        onboardingComplete: false,
        isNewTenant: true
      };
      localStorage.setItem('tenant-context', JSON.stringify(tenantContext));
      
      // Redirect to onboarding to create personalized AI persona FIRST
      window.location.href = '/onboarding';
      console.log("Signup successful, redirecting to onboarding for persona creation:", { tenantContext, result })
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : "An error occurred during signup",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialAuth = async (provider: string) => {
    if (provider === 'Google') {
      try {
        setIsLoading(true)
        const { authClient } = await import('@/lib/auth-client');
        await authClient.signInWithGoogle();
      } catch (error) {
        setErrors({
          general: error instanceof Error ? error.message : "Google sign-in failed",
        })
      } finally {
        setIsLoading(false)
      }
    }
  }

  // Helper function to generate subdomain from company name
  const generateSubdomainFromCompany = (companyName: string): string => {
    return companyName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .substring(0, 30) // Limit length
      || 'company'; // Fallback
  }

  // Helper function to check if subdomain already exists
  const checkSubdomainExists = async (subdomain: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/tenants/check?subdomain=${subdomain}`);
      if (response.ok) {
        const data = await response.json();
        return data.exists;
      }
      return false;
    } catch (error) {
      console.error('Error checking subdomain:', error);
      return false; // Assume doesn't exist if check fails
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Welcome aboard!</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Your account has been created successfully. Please check your email to verify your account.
            </p>
            <Button 
              onClick={() => {
                // Store signup data for onboarding
                const signupData = {
                  companyName: formData.companyName,
                  email: formData.email,
                  timestamp: new Date().toISOString()
                };
                localStorage.setItem('signup-data', JSON.stringify(signupData));
                
                // Redirect to frontend onboarding flow (5-question setup)
                window.location.href = '/onboarding';
              }}
              className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-sm"
            >
              Set Up Your AI Assistant
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950 flex items-center justify-center p-3 py-4">
      <div className="w-full max-w-sm space-y-2">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <DocsFlowBrand size="sm" variant="horizontal" iconVariant="primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Start your free trial</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Join thousands of businesses using AI-powered DocsFlow.
          </p>
        </div>

        {/* Social Auth - Google Only */}
        <Button
          variant="outline"
          className="w-full h-10 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 bg-transparent text-sm"
          onClick={() => handleSocialAuth("Google")}
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
              d="M12 1C5.38 1 0 6.38 0 12s5.38 11 12 11 12-4.93 12-11S18.62 1 12 1zm0 20c-4.97 0-9-4.03-9-9s4.03-9 9-9 9 4.03 9 9-4.03 9-9 9z"
            />
          </svg>
          Sign up with Google
        </Button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-slate-50 dark:bg-slate-950 text-gray-500 dark:text-gray-400">
              Or create account with email
            </span>
          </div>
        </div>

        {/* Signup Form */}
        <Card>
          <CardContent className="pt-3">
            {errors.general && (
              <Alert className="mb-3 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="text-red-700 dark:text-red-300 text-sm">{errors.general}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-2.5">
              <div className="space-y-1">
                <Label htmlFor="companyName" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Company name
                </Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="companyName"
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange("companyName", e.target.value)}
                    className={`pl-9 h-9 text-sm ${errors.companyName ? "border-red-500 focus:border-red-500" : ""}`}
                    placeholder="Enter your company name"
                    disabled={isLoading}
                  />
                </div>
                {errors.companyName && (
                  <p className="text-xs text-red-600 dark:text-red-400 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.companyName}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Work email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className={`pl-9 h-9 text-sm ${errors.email ? "border-red-500 focus:border-red-500" : ""}`}
                    placeholder="Enter your work email"
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
                    className={`pl-9 pr-9 h-9 text-sm ${errors.password ? "border-red-500 focus:border-red-500" : ""}`}
                    placeholder="Create a strong password"
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

                {/* Compact Password Strength Indicator */}
                {formData.password && (
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Progress value={passwordStrength.score} className="flex-1 h-1" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {passwordStrength.score < 25
                          ? "Weak"
                          : passwordStrength.score < 50
                            ? "Fair"
                            : passwordStrength.score < 75
                              ? "Good"
                              : "Strong"}
                      </span>
                    </div>
                    {passwordStrength.feedback.length > 0 && (
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        <div className="flex flex-wrap gap-1">
                          {passwordStrength.feedback.map((item, index) => (
                            <span key={index} className="flex items-center text-red-500">
                              <X className="h-3 w-3 mr-0.5" />
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {errors.password && (
                  <p className="text-xs text-red-600 dark:text-red-400 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.password}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="confirmPassword" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Confirm password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    className={`pl-9 pr-9 h-9 text-sm ${errors.confirmPassword ? "border-red-500 focus:border-red-500" : ""}`}
                    placeholder="Confirm your password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <p className="text-xs text-green-600 dark:text-green-400 flex items-center">
                    <Check className="h-3 w-3 mr-1" />
                    Passwords match
                  </p>
                )}
                {errors.confirmPassword && (
                  <p className="text-xs text-red-600 dark:text-red-400 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Terms and Privacy - Compact */}
              <div className="space-y-1.5">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={formData.agreeToTerms}
                    onCheckedChange={(checked) => handleInputChange("agreeToTerms", checked as boolean)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="terms" className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    I agree to the{" "}
                    <Link href="/terms" className="text-blue-600 hover:text-blue-500 dark:text-blue-400">
                      Terms of Service
                    </Link>
                  </Label>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="privacy"
                    checked={formData.agreeToPrivacy}
                    onCheckedChange={(checked) => handleInputChange("agreeToPrivacy", checked as boolean)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="privacy" className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    I agree to the{" "}
                    <Link href="/privacy" className="text-blue-600 hover:text-blue-500 dark:text-blue-400">
                      Privacy Policy
                    </Link>
                  </Label>
                </div>

                {errors.terms && (
                  <p className="text-xs text-red-600 dark:text-red-400 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.terms}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Start Free Trial"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Sign in link */}
        <p className="text-center text-xs text-gray-600 dark:text-gray-300">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          >
            Sign in
          </Link>
        </p>

        {/* Security notice */}
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            🔒 Enterprise-grade security • SOC 2 compliant • GDPR ready
          </p>
        </div>
      </div>
    </div>
  )
}
