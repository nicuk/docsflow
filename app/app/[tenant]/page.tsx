"use client"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { TenantProvider } from "@/components/tenant-provider"
import { TenantHeader } from "@/components/tenant-header"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { MetricsCards } from "@/components/metrics-cards"
import { LeadFeed } from "@/components/lead-feed"
import { AnalyticsPreview } from "@/components/analytics-preview"
import { useTenantDashboard } from "@/hooks/use-tenant-dashboard"
import { Skeleton } from "@/components/ui/skeleton"

function DashboardContent() {
  const { data, loading, tenants } = useTenantDashboard("1") // Default to first tenant

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
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
          <main className="p-6 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Lead Router Dashboard</h1>
              <p className="text-gray-600">Real-time lead management and AI-powered routing for {data.tenant.name}</p>
            </div>

            <MetricsCards metrics={data.metrics} />

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <LeadFeed leads={data.recentLeads} />
              </div>
              <div className="space-y-6">
                <AnalyticsPreview />
              </div>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TenantProvider>
  )
}

export default function TenantDashboardPage() {
  return <DashboardContent />
} 