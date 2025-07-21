export interface AnalyticsData {
  period: { start: Date; end: Date }
  metrics: {
    totalLeads: { current: number; previous: number; change: number; channelBreakdown: ChannelData[] }
    avgResponseTime: { minutes: number; slaCompliance: number; channelBreakdown: ChannelResponseTime[] }
    aiAccuracy: { percentage: number; confidenceDistribution: number[]; humanOverrideRate: number }
    conversionRate: { percentage: number; revenue?: number; topIntents: IntentPerformance[] }
  }
  trends: {
    dailyLeads: DailyLeadData[]
    responseTimeHourly: HourlyResponseData[]
    intentDistribution: IntentDistribution[]
    conversionFunnel: FunnelStage[]
  }
  teamPerformance: TeamMember[]
  industryMetrics: IndustryMetrics
}

export interface ChannelData {
  channel: "whatsapp" | "email" | "form"
  count: number
  percentage: number
}

export interface ChannelResponseTime {
  channel: "whatsapp" | "email" | "form"
  avgMinutes: number
  slaCompliance: number
}

export interface DailyLeadData {
  date: string
  whatsapp: number
  email: number
  forms: number
  total: number
}

export interface HourlyResponseData {
  hour: number
  avgMinutes: number
  volume: number
}

export interface IntentDistribution {
  intent: string
  count: number
  accuracy: number
  conversionRate: number
}

export interface IntentPerformance {
  intent: string
  conversionRate: number
  revenue: number
}

export interface FunnelStage {
  stage: "leads" | "responded" | "qualified" | "closed"
  count: number
  percentage: number
}

export interface TeamMember {
  userId: string
  name: string
  avatar?: string
  leadsHandled: number
  avgResponseTime: number
  conversionRate: number
  revenue: number
}

export interface IndustryMetrics {
  type: "motorcycle" | "warehouse"
  specificMetrics: {
    [key: string]: number | string
  }
}

export type TimePeriod = "today" | "7d" | "30d" | "90d" | "custom"
