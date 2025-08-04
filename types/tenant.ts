export interface TenantContext {
  id: string
  subdomain: string
  name: string
  industry: "motorcycle_dealer" | "warehouse_distribution" | "general"
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
  // Additional fields for compatibility
  custom_persona?: any
  subscription_status?: string
  plan_type?: string
  created_at?: string
  branding?: {
    logoUrl?: string
    primaryColor?: string
    secondaryColor?: string
  }
  createdAt?: number
  leadCount?: number
  lastActivity?: number
  aiEnabled?: boolean
  subscriptionTier?: string
  contactEmail?: string
  displayName?: string
  emoji?: string
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
