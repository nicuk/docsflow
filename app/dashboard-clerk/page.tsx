"use client"

import { useUser, useOrganization, SignOutButton, SignInButton } from '@clerk/nextjs'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, FileText, Settings, LogOut, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"

/**
 * Isolated Clerk Test Dashboard
 * 
 * Purpose: Test Clerk authentication in isolation
 * Route: /dashboard-clerk (doesn't affect /dashboard)
 * Feature Flag: Test with NEXT_PUBLIC_USE_CLERK=true
 */
export default function ClerkTestDashboard() {
  const { user, isLoaded: userLoaded } = useUser()
  const { organization, isLoaded: orgLoaded } = useOrganization()

  // DEBUG: Log auth state
  console.log('🔍 Clerk Auth State:', {
    userLoaded,
    orgLoaded,
    hasUser: !!user,
    userId: user?.id,
    userEmail: user?.emailAddresses[0]?.emailAddress
  })

  if (!userLoaded || !orgLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Clerk authentication...</p>
          <p className="text-xs text-gray-500 mt-2">userLoaded: {userLoaded.toString()}, orgLoaded: {orgLoaded.toString()}</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Clerk Test Dashboard</CardTitle>
            <CardDescription>
              This is an isolated test route for Clerk authentication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Test Environment</strong><br />
                This route is for testing Clerk integration without affecting the main dashboard.
              </p>
            </div>
            <SignInButton mode="modal">
              <Button className="w-full">Sign In with Clerk</Button>
            </SignInButton>
            <div className="text-center text-sm text-gray-600">
              <Link href="/dashboard" className="text-blue-600 hover:underline">
                ← Back to main dashboard (Supabase)
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                🧪 Clerk Test Dashboard
              </h1>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Isolated Test Environment
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user.emailAddresses[0]?.emailAddress}
              </span>
              <SignOutButton>
                <Button variant="outline" size="sm">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </SignOutButton>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Banner */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-semibold text-green-900">✅ Clerk Authentication Working!</h3>
              <p className="text-sm text-green-800 mt-1">
                You're successfully authenticated with Clerk. This proves the Clerk integration is functional.
              </p>
            </div>
          </div>
        </div>

        {/* Test Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                Authentication
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-600">Clerk user authenticated</p>
              <p className="text-sm font-semibold mt-1">{user.firstName || 'User'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center">
                {organization ? (
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 text-gray-400 mr-2" />
                )}
                Organization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-600">
                {organization ? 'Organization detected' : 'No organization (optional)'}
              </p>
              {organization && (
                <p className="text-sm font-semibold mt-1">{organization.name}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                Session
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-600">Active Clerk session</p>
              <p className="text-sm font-semibold mt-1">Valid</p>
            </CardContent>
          </Card>
        </div>

        {/* User Details */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Clerk User Details</CardTitle>
            <CardDescription>Information retrieved from Clerk</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">User ID</dt>
                <dd className="text-sm text-gray-900 mt-1 font-mono">{user.id}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900 mt-1">{user.emailAddresses[0]?.emailAddress}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {user.firstName} {user.lastName}
                </dd>
              </div>
              {organization && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Organization</dt>
                  <dd className="text-sm text-gray-900 mt-1">{organization.name}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>Phase 2 validation complete</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>✅ Phase 2 Success!</strong><br />
                Clerk authentication is working in isolation. The main dashboard (/dashboard) 
                continues to use Supabase auth without any interference.
              </p>
            </div>
            <div className="flex space-x-4">
              <Link href="/dashboard">
                <Button variant="outline">
                  View Main Dashboard (Supabase)
                </Button>
              </Link>
              <a href="https://dashboard.clerk.com" target="_blank" rel="noopener noreferrer">
                <Button variant="outline">
                  Open Clerk Dashboard
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
