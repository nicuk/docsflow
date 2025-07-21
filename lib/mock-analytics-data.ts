import type { AnalyticsData, TimePeriod } from "@/types/analytics"

export const generateMockAnalyticsData = (
  period: TimePeriod,
  industry: "motorcycle" | "warehouse" = "motorcycle",
): AnalyticsData => {
  const now = new Date()
  let startDate: Date
  const endDate = now

  switch (period) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case "7d":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case "30d":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case "90d":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }

  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  // Generate daily lead data
  const dailyLeads = Array.from({ length: days }, (_, i) => {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
    const whatsapp = Math.floor(Math.random() * 50) + 10
    const email = Math.floor(Math.random() * 30) + 5
    const forms = Math.floor(Math.random() * 20) + 3

    return {
      date: date.toISOString().split("T")[0],
      whatsapp,
      email,
      forms,
      total: whatsapp + email + forms,
    }
  })

  const totalLeads = dailyLeads.reduce((sum, day) => sum + day.total, 0)
  const previousPeriodLeads = Math.floor(totalLeads * (0.8 + Math.random() * 0.4))

  const motorcycleIntents = ["Sales Inquiry", "Service Appointment", "Parts Request", "Financing", "Warranty"]
  const warehouseIntents = ["Quote Request", "Order Status", "Shipping Inquiry", "Supplier Question"]
  const intents = industry === "motorcycle" ? motorcycleIntents : warehouseIntents

  return {
    period: { start: startDate, end: endDate },
    metrics: {
      totalLeads: {
        current: totalLeads,
        previous: previousPeriodLeads,
        change: Math.round(((totalLeads - previousPeriodLeads) / previousPeriodLeads) * 100),
        channelBreakdown: [
          {
            channel: "whatsapp",
            count: dailyLeads.reduce((sum, day) => sum + day.whatsapp, 0),
            percentage: 55,
          },
          {
            channel: "email",
            count: dailyLeads.reduce((sum, day) => sum + day.email, 0),
            percentage: 30,
          },
          {
            channel: "form",
            count: dailyLeads.reduce((sum, day) => sum + day.forms, 0),
            percentage: 15,
          },
        ],
      },
      avgResponseTime: {
        minutes: 8.5,
        slaCompliance: 87,
        channelBreakdown: [
          { channel: "whatsapp", avgMinutes: 6.2, slaCompliance: 92 },
          { channel: "email", avgMinutes: 12.1, slaCompliance: 78 },
          { channel: "form", avgMinutes: 15.3, slaCompliance: 65 },
        ],
      },
      aiAccuracy: {
        percentage: 94,
        confidenceDistribution: [15, 25, 35, 25], // Low, Medium, High, Very High
        humanOverrideRate: 12,
      },
      conversionRate: {
        percentage: 23.5,
        revenue: 125000,
        topIntents: intents.map((intent, index) => ({
          intent,
          conversionRate: 20 + Math.random() * 15,
          revenue: 15000 + Math.random() * 25000,
        })),
      },
    },
    trends: {
      dailyLeads,
      responseTimeHourly: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        avgMinutes: 5 + Math.random() * 10 + (hour < 9 || hour > 17 ? 5 : 0),
        volume: Math.floor(Math.random() * 20) + (hour >= 9 && hour <= 17 ? 10 : 2),
      })),
      intentDistribution: intents.map((intent) => ({
        intent,
        count: Math.floor(Math.random() * 100) + 20,
        accuracy: 85 + Math.random() * 15,
        conversionRate: 15 + Math.random() * 20,
      })),
      conversionFunnel: [
        { stage: "leads", count: totalLeads, percentage: 100 },
        { stage: "responded", count: Math.floor(totalLeads * 0.85), percentage: 85 },
        { stage: "qualified", count: Math.floor(totalLeads * 0.45), percentage: 45 },
        { stage: "closed", count: Math.floor(totalLeads * 0.23), percentage: 23 },
      ],
    },
    teamPerformance: [
      {
        userId: "1",
        name: "Sarah Johnson",
        avatar: "/placeholder.svg?height=32&width=32",
        leadsHandled: 145,
        avgResponseTime: 6.2,
        conversionRate: 28.5,
        revenue: 45000,
      },
      {
        userId: "2",
        name: "Mike Wilson",
        avatar: "/placeholder.svg?height=32&width=32",
        leadsHandled: 132,
        avgResponseTime: 8.1,
        conversionRate: 24.1,
        revenue: 38000,
      },
      {
        userId: "3",
        name: "Lisa Chen",
        avatar: "/placeholder.svg?height=32&width=32",
        leadsHandled: 98,
        avgResponseTime: 7.5,
        conversionRate: 31.2,
        revenue: 42000,
      },
    ],
    industryMetrics: {
      type: industry,
      specificMetrics:
        industry === "motorcycle"
          ? {
              testRideConversion: 65,
              seasonalMultiplier: 1.3,
              serviceToSalesRatio: 0.4,
              avgDealValue: 15000,
            }
          : {
              quoteAccuracy: 89,
              avgOrderValue: 25000,
              shippingResolutionTime: 4.2,
              supplierLeadConversion: 18,
            },
    },
  }
}
