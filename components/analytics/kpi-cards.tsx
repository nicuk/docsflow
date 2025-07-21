"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Clock, Brain, Target, MessageSquare, Mail, Globe } from "lucide-react"
import type { AnalyticsData } from "@/types/analytics"

interface KPICardsProps {
  data: AnalyticsData
}

export function KPICards({ data }: KPICardsProps) {
  const { metrics } = data

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(num)
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "whatsapp":
        return <MessageSquare className="h-3 w-3" />
      case "email":
        return <Mail className="h-3 w-3" />
      case "form":
        return <Globe className="h-3 w-3" />
      default:
        return <MessageSquare className="h-3 w-3" />
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Leads */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
          <MessageSquare className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(metrics.totalLeads.current)}</div>
          <div className="flex items-center text-xs text-muted-foreground">
            {metrics.totalLeads.change > 0 ? (
              <TrendingUp className="mr-1 h-3 w-3 text-green-600" />
            ) : (
              <TrendingDown className="mr-1 h-3 w-3 text-red-600" />
            )}
            <span className={metrics.totalLeads.change > 0 ? "text-green-600" : "text-red-600"}>
              {Math.abs(metrics.totalLeads.change)}%
            </span>
            <span className="ml-1">from last period</span>
          </div>
          <div className="mt-3 space-y-1">
            {metrics.totalLeads.channelBreakdown.map((channel) => (
              <div key={channel.channel} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  {getChannelIcon(channel.channel)}
                  <span className="capitalize">{channel.channel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{formatNumber(channel.count)}</span>
                  <Badge variant="secondary" className="text-xs">
                    {channel.percentage}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Response Time */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          <Clock className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.avgResponseTime.minutes.toFixed(1)}m</div>
          <div className="flex items-center text-xs text-muted-foreground">
            <Badge variant={metrics.avgResponseTime.slaCompliance > 85 ? "default" : "destructive"} className="text-xs">
              {metrics.avgResponseTime.slaCompliance}% SLA
            </Badge>
            <span className="ml-2">Target: &lt;2min</span>
          </div>
          <div className="mt-3 space-y-1">
            {metrics.avgResponseTime.channelBreakdown.map((channel) => (
              <div key={channel.channel} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  {getChannelIcon(channel.channel)}
                  <span className="capitalize">{channel.channel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{channel.avgMinutes.toFixed(1)}m</span>
                  <Badge variant={channel.slaCompliance > 85 ? "default" : "destructive"} className="text-xs">
                    {channel.slaCompliance}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Accuracy */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">AI Accuracy</CardTitle>
          <Brain className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.aiAccuracy.percentage}%</div>
          <div className="flex items-center text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {metrics.aiAccuracy.humanOverrideRate}% Override Rate
            </Badge>
          </div>
          <div className="mt-3">
            <div className="text-xs font-medium mb-2">Confidence Distribution</div>
            <div className="grid grid-cols-4 gap-1">
              {["Low", "Med", "High", "V.High"].map((label, index) => (
                <div key={label} className="text-center">
                  <div className="text-xs font-medium">{metrics.aiAccuracy.confidenceDistribution[index]}%</div>
                  <div className="text-xs text-gray-500">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversion Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          <Target className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.conversionRate.percentage}%</div>
          {metrics.conversionRate.revenue && (
            <div className="text-sm text-muted-foreground">
              {formatCurrency(metrics.conversionRate.revenue)} revenue
            </div>
          )}
          <div className="mt-3">
            <div className="text-xs font-medium mb-2">Top Performing Intents</div>
            <div className="space-y-1">
              {metrics.conversionRate.topIntents.slice(0, 2).map((intent) => (
                <div key={intent.intent} className="flex items-center justify-between text-xs">
                  <span className="truncate">{intent.intent}</span>
                  <Badge variant="secondary" className="text-xs">
                    {intent.conversionRate.toFixed(1)}%
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
