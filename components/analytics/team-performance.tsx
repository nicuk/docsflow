"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Trophy, Clock, Target, DollarSign } from "lucide-react"
import type { TeamMember } from "@/types/analytics"

interface TeamPerformanceProps {
  data: TeamMember[]
}

export function TeamPerformance({ data }: TeamPerformanceProps) {
  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(num)
  }

  const sortedByConversion = [...data].sort((a, b) => b.conversionRate - a.conversionRate)
  const sortedByResponse = [...data].sort((a, b) => a.avgResponseTime - b.avgResponseTime)
  const sortedByRevenue = [...data].sort((a, b) => b.revenue - a.revenue)

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Team Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            Team Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sortedByConversion.map((member, index) => (
            <div key={member.userId} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatar || "/placeholder.svg"} />
                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                </div>
                <div>
                  <div className="font-medium">{member.name}</div>
                  <div className="text-sm text-gray-500">{member.leadsHandled} leads handled</div>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="default" className="mb-1">
                  {member.conversionRate.toFixed(1)}%
                </Badge>
                <div className="text-xs text-gray-500">conversion</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Best Response Time */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="font-medium">Fastest Response</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={sortedByResponse[0]?.avatar || "/placeholder.svg"} />
                  <AvatarFallback>{sortedByResponse[0]?.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{sortedByResponse[0]?.name}</span>
              </div>
              <Badge variant="outline">{sortedByResponse[0]?.avgResponseTime.toFixed(1)}m avg</Badge>
            </div>
          </div>

          {/* Highest Revenue */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="font-medium">Top Revenue</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={sortedByRevenue[0]?.avatar || "/placeholder.svg"} />
                  <AvatarFallback>{sortedByRevenue[0]?.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{sortedByRevenue[0]?.name}</span>
              </div>
              <Badge variant="outline">{formatCurrency(sortedByRevenue[0]?.revenue || 0)}</Badge>
            </div>
          </div>

          {/* Best Conversion */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-purple-600" />
              <span className="font-medium">Best Conversion</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={sortedByConversion[0]?.avatar || "/placeholder.svg"} />
                  <AvatarFallback>{sortedByConversion[0]?.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{sortedByConversion[0]?.name}</span>
              </div>
              <Badge variant="outline">{sortedByConversion[0]?.conversionRate.toFixed(1)}%</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
