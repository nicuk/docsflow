"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import type { HourlyResponseData } from "@/types/analytics"

interface ResponseTimeAnalysisProps {
  data: HourlyResponseData[]
}

export function ResponseTimeAnalysis({ data }: ResponseTimeAnalysisProps) {
  const distributionData = [
    { range: "<1min", count: 45, percentage: 25 },
    { range: "1-5min", count: 78, percentage: 43 },
    { range: "5-15min", count: 42, percentage: 23 },
    { range: ">15min", count: 16, percentage: 9 },
  ]

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Response Time Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Response Time Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={distributionData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip
                formatter={(value: number, name: string) => [value, name === "count" ? "Leads" : "Percentage"]}
              />
              <Bar dataKey="count" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Hourly Response Time Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Response Time by Hour</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" tickFormatter={(hour) => `${hour}:00`} />
              <YAxis />
              <Tooltip
                labelFormatter={(hour) => `${hour}:00`}
                formatter={(value: number) => [`${value.toFixed(1)} min`, "Avg Response Time"]}
              />
              <Line type="monotone" dataKey="avgMinutes" stroke="#F59E0B" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
