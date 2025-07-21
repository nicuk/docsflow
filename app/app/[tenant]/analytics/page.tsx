"use client"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { TenantProvider } from "@/components/tenant-provider"
import { TenantHeader } from "@/components/tenant-header"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { useTenantDashboard } from "@/hooks/use-tenant-dashboard"
import { Skeleton } from "@/components/ui/skeleton"
import { AnalyticsPreview } from "@/components/analytics-preview"

function AnalyticsContent() {
  const { data, loading, tenants } = useTenantDashboard()

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <TenantProvider initialTenant={data.tenant} tenants={tenants}>
      <SidebarProvider>
        <DashboardSidebar />
        <SidebarInset>
          <TenantHeader />
          <main className="p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600">Deep insights and performance metrics for {data.tenant.name}</p>
            </div>
            <AnalyticsPreview />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TenantProvider>
  )
}

export default function AnalyticsPage() {
  return <AnalyticsContent />
} 