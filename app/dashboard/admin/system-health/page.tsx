"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import BackendStatus from "@/components/backend-status"
import { SecurityMonitor } from "@/components/security-monitor"
import ProcessFlowTracker from "@/components/admin/process-flow-tracker"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Shield, Server, Activity } from "lucide-react"

export default function SystemHealthPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  
  // 🔐 ADMIN ONLY: Redirect non-admins
  useEffect(() => {
    if (!isLoading && user) {
      // Check if user is admin (access_level === 1)
      const isAdmin = user.accessLevel === 1 || user.role === 'admin'
      if (!isAdmin) {
        console.warn('⛔ [SYSTEM HEALTH] Access denied: User is not an admin')
        router.push('/dashboard')
      }
    }
  }, [user, isLoading, router])

  // Show loading while checking auth
  if (isLoading || !user) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-7xl">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
        </div>
      </div>
    )
  }

  const isAdmin = user.accessLevel === 1 || user.role === 'admin'
  
  // Redirect non-admins (final check)
  if (!isAdmin) {
    return null
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">System Health & Security</h1>
          <p className="text-sm text-muted-foreground">Admin-only monitoring dashboard</p>
        </div>
      </div>

      {/* Process Flow Tracker Section */}
      <section>
        <ProcessFlowTracker />
      </section>

      {/* Backend Status Section */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Backend Status
            </CardTitle>
            <CardDescription>Real-time monitoring of API endpoints and services</CardDescription>
          </CardHeader>
          <CardContent>
            <BackendStatus />
          </CardContent>
        </Card>
      </section>

      {/* Security Monitor Section */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Monitor
            </CardTitle>
            <CardDescription>Recent security events and threat analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <SecurityMonitor />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

