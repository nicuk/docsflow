"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react"
import { useTenant } from "./tenant-provider"
import { getIndustryTheme } from "@/lib/tenant-themes"

export function AnalyticsPreview() {
  const { currentTenant } = useTenant()

  if (!currentTenant) return null

  const theme = getIndustryTheme(currentTenant.industry)

  // Mock analytics data
  const analyticsData = {
    weeklyTrend: { value: 23, change: 15, trend: "up" as const },
    conversionRate: { value: 12.5, change: -2.1, trend: "down" as const },
    topChannel: currentTenant.industry === "motorcycle_dealer" ? "WhatsApp" : "Email",
    teamPerformance: { active: 5, total: 8 },
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className={`h-5 w-5 text-${theme.primary}`} />
            <span>7-Day Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Total Leads</span>
            <div className="flex items-center space-x-2">
              <span className="font-semibold">{analyticsData.weeklyTrend.value}</span>
              <div className="flex items-center text-xs">
                {analyticsData.weeklyTrend.trend === "up" ? (
                  <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                )}
                <span className={analyticsData.weeklyTrend.trend === "up" ? "text-green-600" : "text-red-600"}>
                  {analyticsData.weeklyTrend.change}%
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Conversion Rate</span>
            <div className="flex items-center space-x-2">
              <span className="font-semibold">{analyticsData.conversionRate.value}%</span>
              <div className="flex items-center text-xs">
                {analyticsData.conversionRate.trend === "up" ? (
                  <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                )}
                <span className={analyticsData.conversionRate.trend === "up" ? "text-green-600" : "text-red-600"}>
                  {Math.abs(analyticsData.conversionRate.change)}%
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Top Channel</span>
            <Badge className={`bg-${theme.primary} text-white`}>{analyticsData.topChannel}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Active Team Members</span>
            <span className="font-semibold">
              {analyticsData.teamPerformance.active}/{analyticsData.teamPerformance.total}
            </span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`bg-${theme.primary} h-2 rounded-full`}
              style={{
                width: `${(analyticsData.teamPerformance.active / analyticsData.teamPerformance.total) * 100}%`,
              }}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Availability</span>
              <span className="text-green-600 font-medium">Online</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Response SLA</span>
              <span className="text-green-600 font-medium">On Track</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
