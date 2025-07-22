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
  subdomain: string
  emoji: string
  createdAt: number
  displayName?: string
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

  const displayName = tenant.displayName || 
    `${tenant.subdomain.charAt(0).toUpperCase() + tenant.subdomain.slice(1)} Company`

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="text-4xl">{tenant.emoji}</div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {displayName}
                </h1>
                <p className="text-sm text-gray-500">
                  {tenant.subdomain}.{rootDomain}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary">Active</Badge>
              <Link href={`${protocol}://${rootDomain}/admin`}>
                <Button variant="outline" size="sm">
                  Admin Panel
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6">
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          {/* Welcome Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Welcome</CardTitle>
              <CardDescription>
                Your tenant dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Created: {new Date(tenant.createdAt).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600">
                  Subdomain: <code className="bg-gray-100 px-1 rounded">{tenant.subdomain}</code>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Stats</CardTitle>
              <CardDescription>
                Platform metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <Badge variant="secondary" className="text-green-600">Online</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Uptime:</span>
                  <span className="text-sm font-medium">99.9%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>
                Manage your tenant
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href={`${protocol}://${rootDomain}/admin`}>
                <Button variant="outline" size="sm" className="w-full">
                  Manage Settings
                </Button>
              </Link>
              <Link href={`${protocol}://${tenant.subdomain}.${rootDomain}`}>
                <Button variant="outline" size="sm" className="w-full">
                  View Public Page
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Content */}
        <Card>
          <CardHeader>
            <CardTitle>AI Lead Router Dashboard</CardTitle>
            <CardDescription>
              Real-time lead management and AI-powered routing for {displayName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
              {/* Metrics Cards */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Leads Today</p>
                    <p className="text-2xl font-bold text-gray-900">23</p>
                  </div>
                  <div className="text-green-600">
                    <span className="text-sm">↗ 15%</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Response Time</p>
                    <p className="text-2xl font-bold text-gray-900">13m</p>
                  </div>
                  <Badge variant="secondary" className="text-green-600">GOOD</Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">Target: 15m</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">AI Accuracy</p>
                    <p className="text-2xl font-bold text-gray-900">93%</p>
                  </div>
                  <div className="text-green-600">
                    <span className="text-sm">↗ Improving</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Channel Status</p>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs">WhatsApp</span>
                      <Badge variant="secondary" className="text-green-600">Active</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs">Email</span>
                      <Badge variant="secondary" className="text-green-600">Active</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs">Forms</span>
                      <Badge variant="secondary" className="text-green-600">Active</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium">New lead contacted</p>
                      <p className="text-xs text-gray-500">2 minutes ago • +1234567890 • Confidence: 95%</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Harley Davidson models
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium">Lead contacted</p>
                      <p className="text-xs text-gray-500">5 minutes ago • +1234567891 • Confidence: 87%</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Service scheduling
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
} 