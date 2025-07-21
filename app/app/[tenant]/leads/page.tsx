"use client"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { TenantProvider } from "@/components/tenant-provider"
import { TenantHeader } from "@/components/tenant-header"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { useTenantDashboard } from "@/hooks/use-tenant-dashboard"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

function LeadsContent() {
  const { data, loading, tenants } = useTenantDashboard()

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!data) return null

  // Mock leads data based on tenant
  const mockLeads = [
    {
      id: "1",
      name: "John Smith",
      email: "john@example.com",
      phone: "+1234567890",
      source: "whatsapp",
      status: "new",
      intent: data.tenant.industry === "motorcycle_dealer" ? "Sales Inquiry" : "Quote Request",
      aiConfidence: 95,
      createdAt: "2 minutes ago"
    },
    {
      id: "2", 
      name: "Sarah Johnson",
      email: "sarah@example.com",
      phone: "+1234567891",
      source: "email",
      status: "contacted",
      intent: data.tenant.industry === "motorcycle_dealer" ? "Service Booking" : "Order Status",
      aiConfidence: 87,
      createdAt: "5 minutes ago"
    },
    {
      id: "3",
      name: "Mike Wilson",
      email: "mike@example.com", 
      phone: "+1234567892",
      source: "form",
      status: "qualified",
      intent: data.tenant.industry === "motorcycle_dealer" ? "Test Ride" : "Bulk Order",
      aiConfidence: 92,
      createdAt: "1 hour ago"
    }
  ]

  return (
    <TenantProvider initialTenant={data.tenant} tenants={tenants}>
      <SidebarProvider>
        <DashboardSidebar />
        <SidebarInset>
          <TenantHeader />
          <main className="p-6 space-y-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Leads Management</h1>
              <p className="text-gray-600">Manage and track your leads efficiently for {data.tenant.name}</p>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                  <Badge variant="secondary">📊</Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockLeads.length}</div>
                  <p className="text-xs text-muted-foreground">+2 this week</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">New</CardTitle>
                  <Badge variant="secondary">🆕</Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockLeads.filter(l => l.status === 'new').length}</div>
                  <p className="text-xs text-muted-foreground">Needs attention</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Qualified</CardTitle>
                  <Badge variant="secondary">✅</Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockLeads.filter(l => l.status === 'qualified').length}</div>
                  <p className="text-xs text-muted-foreground">Ready to convert</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg AI Score</CardTitle>
                  <Badge variant="secondary">🤖</Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Math.round(mockLeads.reduce((acc, l) => acc + l.aiConfidence, 0) / mockLeads.length)}%</div>
                  <p className="text-xs text-muted-foreground">Confidence level</p>
                </CardContent>
              </Card>
            </div>

            {/* Leads Table */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockLeads.map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between p-4 border rounded-lg bg-white">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold">{lead.name[0]}</span>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{lead.name}</h3>
                          <p className="text-sm text-gray-500">{lead.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">{lead.source.toUpperCase()}</p>
                          <p className="text-gray-500">Source</p>
                        </div>
                        <div className="text-sm">
                          <Badge variant={lead.status === 'new' ? 'default' : lead.status === 'qualified' ? 'secondary' : 'outline'}>
                            {lead.status}
                          </Badge>
                        </div>
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">{lead.aiConfidence}%</p>
                          <p className="text-gray-500">AI Score</p>
                        </div>
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">{lead.intent}</p>
                          <p className="text-gray-500">Intent</p>
                        </div>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TenantProvider>
  )
}

export default function LeadsPage() {
  return <LeadsContent />
} 