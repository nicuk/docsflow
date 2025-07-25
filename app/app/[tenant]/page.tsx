"use client"

import { useParams } from "next/navigation"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { rootDomain, protocol } from "@/lib/utils"

interface TenantData {
  id: string
  subdomain: string
  name: string
  industry: string
  custom_persona: any
  subscription_status: string
  plan_type: string
  created_at: string
}

export default function TenantDashboardPage() {
  const params = useParams()
  const [tenant, setTenant] = useState<TenantData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const tenantSlug = params?.tenant as string
        if (!tenantSlug) {
          setError('No tenant specified')
          return
        }

        // Fetch tenant data from Supabase
        const response = await fetch(`/api/tenant/${tenantSlug}`)
        if (!response.ok) {
          const errorData = await response.json()
          setError(errorData.error || 'Failed to load tenant')
          return
        }

        const tenantData = await response.json()
        setTenant(tenantData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tenant')
      } finally {
        setLoading(false)
      }
    }

    fetchTenant()
  }, [params?.tenant])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Tenant</CardTitle>
            <CardDescription>
              {error || 'Tenant not found'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`${protocol}://${rootDomain}`}>
              <Button variant="outline" className="w-full">
                Return to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const displayName = tenant.name || 
    `${tenant.subdomain.charAt(0).toUpperCase() + tenant.subdomain.slice(1)} Company`

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {displayName} Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              AI Document Intelligence Platform
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={tenant.subscription_status === 'trial' ? 'secondary' : 'default'}>
              {tenant.subscription_status === 'trial' ? 'Trial' : tenant.plan_type}
            </Badge>
            <Button variant="outline" size="sm">
              Settings
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documents</CardTitle>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-4 w-4 text-muted-foreground"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14,2 14,8 20,8" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Upload documents to get started
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversations</CardTitle>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-4 w-4 text-muted-foreground"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Start chatting with your AI assistant
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Assistant</CardTitle>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-4 w-4 text-muted-foreground"
              >
                <path d="M12 2a3 3 0 0 0-3 3c0 1.68 1.66 3.11 3.75 3.5C9.56 8.75 9 9.5 9 10.5c0 1.1.9 2 2 2s2-.9 2-2c0-1-.56-1.75-1.75-2.5C15.34 8.11 17 6.68 17 5a3 3 0 0 0-3-3z" />
                <path d="M12 2a3 3 0 0 0-3 3c0 1.68 1.66 3.11 3.75 3.5C9.56 8.75 9 9.5 9 10.5c0 1.1.9 2 2 2s2-.9 2-2c0-1-.56-1.75-1.75-2.5C15.34 8.11 17 6.68 17 5a3 3 0 0 0-3-3z" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Ready</div>
              <p className="text-xs text-muted-foreground">
                {tenant.custom_persona?.role || 'AI Assistant'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle>Welcome to {displayName}</CardTitle>
            <CardDescription>
              Your AI Document Intelligence platform is ready. Start by uploading documents or chatting with your AI assistant.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Button className="h-32 flex flex-col items-center justify-center space-y-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-8 w-8"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>Start Chatting</span>
                <span className="text-sm opacity-70">Ask questions about your documents</span>
              </Button>

              <Button variant="outline" className="h-32 flex flex-col items-center justify-center space-y-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-8 w-8"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14,2 14,8 20,8" />
                </svg>
                <span>Upload Documents</span>
                <span className="text-sm opacity-70">Add PDFs, Word docs, and more</span>
              </Button>
            </div>

            {tenant.custom_persona && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Your AI Assistant</h3>
                <p className="text-blue-800 text-sm">
                  <strong>Role:</strong> {tenant.custom_persona.role}<br/>
                  <strong>Focus:</strong> {tenant.custom_persona.focus_areas?.join(', ')}<br/>
                  <strong>Tone:</strong> {tenant.custom_persona.tone}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 