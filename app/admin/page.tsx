"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Shield, ArrowLeft } from "lucide-react"
import BackendStatus from "@/components/backend-status"
import { SecurityMonitor } from "@/components/security-monitor"
import Link from "next/link"

interface TenantContext {
  tenantId: string
  industry: string
  businessType: string
  accessLevel: number
  onboardingComplete: boolean
}

export default function AdminDashboard() {
  const [tenantContext, setTenantContext] = useState<TenantContext | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAdminAccess = () => {
      try {
        // Get tenant ID from cookie
        const tenantId = document.cookie
          .split('; ')
          .find(row => row.startsWith('tenant-id='))
          ?.split('=')[1]

        if (tenantId) {
          const storedContext = localStorage.getItem(`tenant-${tenantId}`)
          
          if (storedContext) {
            const context = JSON.parse(storedContext)
            setTenantContext(context)
            
            // Check if user has admin access (accessLevel 1)
            if (context.accessLevel === 1) {
              setIsAuthorized(true)
            } else {
              // Redirect non-admin users
              router.push('/dashboard')
              return
            }
          } else {
            // No context, redirect to login
            router.push('/login')
            return
          }
        } else {
          // No tenant ID, redirect to login
          router.push('/login')
          return
        }
      } catch (error) {
        console.error('Failed to check admin access:', error)
        router.push('/dashboard')
      } finally {
        setIsLoading(false)
      }
    }

    checkAdminAccess()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-[400px]">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-2">
              <Shield className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have administrator privileges to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return to Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <Badge variant="destructive">Admin Only</Badge>
            </div>
            <p className="text-muted-foreground">
              System monitoring and backend administration
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        {/* Admin Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Backend Status */}
          <div>
            <BackendStatus />
          </div>
          
          {/* Security Monitor */}
          <div>
            <SecurityMonitor />
          </div>
        </div>

        {/* Admin Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Admin Actions</CardTitle>
            <CardDescription>
              Administrative functions and system management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" size="sm">
                User Management
              </Button>
              <Button variant="outline" size="sm">
                System Logs
              </Button>
              <Button variant="outline" size="sm">
                API Keys
              </Button>
              <Button variant="outline" size="sm">
                Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}