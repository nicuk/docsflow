export interface TenantContext {
  id: string
  subdomain: string
  name: string
  industry: "motorcycle_dealer" | "warehouse_distribution"
  logo?: string
  theme: {
    primary: string
    secondary: string
    accent: string
  }
  settings: {
    businessHours: string
    timezone: string
    slaTarget: number
  }
}

export interface TenantLead {
  id: string
  name: string
  email: string
  phone: string
  source: "whatsapp" | "email" | "form"
  intent: string
  message: string
  createdAt: string
  status: "new" | "contacted" | "qualified" | "converted"
  aiConfidence: number
}

export interface DashboardMetrics {
  leadsToday: { count: number; change: number }
  avgResponseTime: { minutes: number; slaStatus: "good" | "warning" | "critical" }
  aiAccuracy: { percentage: number; trend: "up" | "down" }
  channelHealth: { whatsapp: boolean; email: boolean; forms: boolean }
}

export interface DashboardData {
  tenant: TenantContext
  metrics: DashboardMetrics
  recentLeads: TenantLead[]
}
