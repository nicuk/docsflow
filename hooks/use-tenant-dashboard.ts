"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import type { DashboardData, TenantContext } from "@/types/tenant"

// This hook integrates your professional frontend with our current tenant system
export const useTenantDashboard = (tenantId?: string) => {
  const params = useParams()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)

      try {
        // Get the tenant from URL params (our current routing system)
        const currentTenant = params?.tenant as string || tenantId || "mrtee"
        
        // Fetch tenant data from our existing API
        const response = await fetch(`/api/tenant/${currentTenant}`)
        if (!response.ok) throw new Error('Failed to fetch tenant')
        
        const tenantData = await response.json()

        // Transform our tenant data to match your frontend expectations
        const tenant: TenantContext = {
          id: tenantData.subdomain,
          subdomain: tenantData.subdomain,
          name: tenantData.displayName || `${tenantData.subdomain.charAt(0).toUpperCase() + tenantData.subdomain.slice(1)} Company`,
          industry: tenantData.subdomain === "mrtee" ? "motorcycle_dealer" : "warehouse_distribution",
          logo: "/placeholder.svg?height=40&width=40",
          theme: {
            primary: tenantData.subdomain === "mrtee" ? "orange-600" : "blue-600",
            secondary: "slate-800",
            accent: tenantData.subdomain === "mrtee" ? "amber-500" : "cyan-500",
          },
          settings: {
            businessHours: tenantData.subdomain === "mrtee" ? "9AM - 6PM" : "8AM - 5PM",
            timezone: "PST",
            slaTarget: tenantData.subdomain === "mrtee" ? 15 : 30,
          },
        }

        // Create mock dashboard data based on tenant
        const dashboardData: DashboardData = {
          tenant,
          metrics: {
            leadsToday: { 
              count: Math.floor(Math.random() * 30) + 15, 
              change: Math.floor(Math.random() * 20) - 5 
            },
            avgResponseTime: { 
              minutes: Math.floor(Math.random() * 15) + 5, 
              slaStatus: "good" as const 
            },
            aiAccuracy: { 
              percentage: Math.floor(Math.random() * 10) + 90, 
              trend: "up" as const 
            },
            channelHealth: { whatsapp: true, email: true, forms: true },
          },
          recentLeads: [
            {
              id: "1",
              name: "John Smith",
              email: "john@example.com",
              phone: "+1234567890",
              source: "whatsapp",
              intent: tenant.industry === "motorcycle_dealer" ? "Sales Inquiry" : "Quote Request",
              message: tenant.industry === "motorcycle_dealer"
                ? "Interested in the new Harley Davidson models"
                : "Need quote for 500 unit shipment to California",
              createdAt: "2 minutes ago",
              status: "new",
              aiConfidence: 0.95,
            },
            {
              id: "2",
              name: "Sarah Johnson",
              email: "sarah@example.com",
              phone: "+1234567891",
              source: "email",
              intent: tenant.industry === "motorcycle_dealer" ? "Service Booking" : "Order Status",
              message: tenant.industry === "motorcycle_dealer"
                ? "Need to schedule maintenance for my bike"
                : "Checking status of order #12345",
              createdAt: "5 minutes ago",
              status: "contacted",
              aiConfidence: 0.87,
            },
          ],
        }

        setData(dashboardData)
      } catch (error) {
        console.error('Error loading tenant dashboard:', error)
        // Fallback to mock data if API fails
        const fallbackTenant: TenantContext = {
          id: "demo",
          subdomain: "demo",
          name: "Demo Company",
          industry: "motorcycle_dealer",
          logo: "/placeholder.svg?height=40&width=40",
          theme: {
            primary: "orange-600",
            secondary: "slate-800",
            accent: "amber-500",
          },
          settings: {
            businessHours: "9AM - 6PM",
            timezone: "PST",
            slaTarget: 15,
          },
        }

        setData({
          tenant: fallbackTenant,
          metrics: {
            leadsToday: { count: 23, change: 12 },
            avgResponseTime: { minutes: 8, slaStatus: "good" as const },
            aiAccuracy: { percentage: 94, trend: "up" as const },
            channelHealth: { whatsapp: true, email: true, forms: true },
          },
          recentLeads: [],
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [params?.tenant, tenantId])

  // Mock multiple tenants for the tenant switcher
  const mockTenants: TenantContext[] = [
    {
      id: "mrtee",
      subdomain: "mrtee",
      name: "Mr. Tee Motorcycles",
      industry: "motorcycle_dealer",
      logo: "/placeholder.svg?height=40&width=40",
      theme: {
        primary: "orange-600",
        secondary: "slate-800",
        accent: "amber-500",
      },
      settings: {
        businessHours: "9AM - 6PM",
        timezone: "PST",
        slaTarget: 15,
      },
    },
    {
      id: "apexdist",
      subdomain: "apexdist",
      name: "Apex Distribution",
      industry: "warehouse_distribution",
      logo: "/placeholder.svg?height=40&width=40",
      theme: {
        primary: "blue-600",
        secondary: "slate-700",
        accent: "cyan-500",
      },
      settings: {
        businessHours: "24/7",
        timezone: "EST",
        slaTarget: 30,
      },
    },
  ]

  return { data, loading, tenants: mockTenants }
}
