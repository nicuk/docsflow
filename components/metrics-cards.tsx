"use client"

import { TrendingUp, TrendingDown, Clock, Zap, MessageCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { DashboardMetrics } from "@/types/tenant"
import { useTenant } from "./tenant-provider"
import { getIndustryTheme } from "@/lib/tenant-themes"

interface MetricsCardsProps {
  metrics: DashboardMetrics
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  const { currentTenant } = useTenant()

  if (!currentTenant) return null

  const theme = getIndustryTheme(currentTenant.industry)

  const getSLAColor = (status: string) => {
    switch (status) {
      case "good":
        return "text-green-600"
      case "warning":
        return "text-yellow-600"
      case "critical":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* Today's Leads */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today's Leads</CardTitle>
          <MessageCircle className={`h-4 w-4 text-${theme.primary}`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.leadsToday.count}</div>
          <div className="flex items-center text-xs text-muted-foreground">
            {metrics.leadsToday.change > 0 ? (
              <TrendingUp className="mr-1 h-3 w-3 text-green-600" />
            ) : (
              <TrendingDown className="mr-1 h-3 w-3 text-red-600" />
            )}
            {Math.abs(metrics.leadsToday.change)} from yesterday
          </div>
        </CardContent>
      </Card>

      {/* Response Time */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          <Clock className={`h-4 w-4 text-${theme.primary}`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.avgResponseTime.minutes}m</div>
          <div className="flex items-center text-xs">
            <Badge
              variant={metrics.avgResponseTime.slaStatus === "good" ? "default" : "destructive"}
              className="text-xs"
            >
              {metrics.avgResponseTime.slaStatus.toUpperCase()}
            </Badge>
            <span className="ml-2 text-muted-foreground">Target: {currentTenant.settings.slaTarget}m</span>
          </div>
        </CardContent>
      </Card>

      {/* AI Effectiveness */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">AI Accuracy</CardTitle>
          <Zap className={`h-4 w-4 text-${theme.accent}`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.aiAccuracy.percentage}%</div>
          <div className="flex items-center text-xs text-muted-foreground">
            {metrics.aiAccuracy.trend === "up" ? (
              <TrendingUp className="mr-1 h-3 w-3 text-green-600" />
            ) : (
              <TrendingDown className="mr-1 h-3 w-3 text-red-600" />
            )}
            {metrics.aiAccuracy.trend === "up" ? "Improving" : "Declining"}
          </div>
        </CardContent>
      </Card>

      {/* Channel Health */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Channel Status</CardTitle>
          <div className="flex space-x-1">
            <div className={`h-2 w-2 rounded-full ${metrics.channelHealth.whatsapp ? "bg-green-500" : "bg-red-500"}`} />
            <div className={`h-2 w-2 rounded-full ${metrics.channelHealth.email ? "bg-green-500" : "bg-red-500"}`} />
            <div className={`h-2 w-2 rounded-full ${metrics.channelHealth.forms ? "bg-green-500" : "bg-red-500"}`} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>WhatsApp</span>
              <Badge variant={metrics.channelHealth.whatsapp ? "default" : "destructive"}>
                {metrics.channelHealth.whatsapp ? "Active" : "Down"}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>Email</span>
              <Badge variant={metrics.channelHealth.email ? "default" : "destructive"}>
                {metrics.channelHealth.email ? "Active" : "Down"}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>Forms</span>
              <Badge variant={metrics.channelHealth.forms ? "default" : "destructive"}>
                {metrics.channelHealth.forms ? "Active" : "Down"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
