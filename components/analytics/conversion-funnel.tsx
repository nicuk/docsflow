"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { FunnelStage } from "@/types/analytics"

interface ConversionFunnelProps {
  data: FunnelStage[]
}

export function ConversionFunnel({ data }: ConversionFunnelProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "leads":
        return "bg-blue-500"
      case "responded":
        return "bg-green-500"
      case "qualified":
        return "bg-yellow-500"
      case "closed":
        return "bg-purple-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case "leads":
        return "Total Leads"
      case "responded":
        return "Responded"
      case "qualified":
        return "Qualified"
      case "closed":
        return "Closed/Won"
      default:
        return stage
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion Funnel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {data.map((stage, index) => {
          const nextStage = data[index + 1]
          const dropOffRate = nextStage ? ((stage.count - nextStage.count) / stage.count) * 100 : 0

          return (
            <div key={stage.stage} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getStageColor(stage.stage)}`} />
                  <span className="font-medium">{getStageLabel(stage.stage)}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatNumber(stage.count)}</div>
                  <div className="text-sm text-gray-500">{stage.percentage}%</div>
                </div>
              </div>

              <Progress value={stage.percentage} className="h-2" />

              {nextStage && dropOffRate > 0 && (
                <div className="text-xs text-red-600 text-right">-{dropOffRate.toFixed(1)}% drop-off to next stage</div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
