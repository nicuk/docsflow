"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import type { DailyLeadData } from "@/types/analytics"

interface LeadTrendsChartProps {
  data: DailyLeadData[]
}

export function LeadTrendsChart({ data }: LeadTrendsChartProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Volume Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={formatDate} />
            <YAxis />
            <Tooltip
              labelFormatter={(value) => formatDate(typeof value === 'string' ? value : String(value))}
              formatter={(value: number, name: string) => [value, name.charAt(0).toUpperCase() + name.slice(1)]}
            />
            <Legend />
            <Line type="monotone" dataKey="whatsapp" stroke="#25D366" strokeWidth={2} name="WhatsApp" />
            <Line type="monotone" dataKey="email" stroke="#EA4335" strokeWidth={2} name="Email" />
            <Line type="monotone" dataKey="forms" stroke="#4285F4" strokeWidth={2} name="Forms" />
            <Line type="monotone" dataKey="total" stroke="#6B7280" strokeWidth={2} strokeDasharray="5 5" name="Total" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
