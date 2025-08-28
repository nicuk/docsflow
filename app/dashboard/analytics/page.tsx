"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, BarChart3, FileText, MessageSquare, TrendingUp, Users, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface AnalyticsData {
  totalQuestions: number
  documentsUploaded: number
  timesSaved: number
  totalResponseTime: number
  questions: Array<{
    id: number
    question: string
    timestamp: string
    responseTime: number
    hasDocuments: boolean
    category: string
  }>
  documents: Array<{
    id: number
    filename: string
    size: number
    timestamp: string
  }>
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalQuestions: 0,
    documentsUploaded: 0,
    timesSaved: 0,
    totalResponseTime: 0,
    questions: [],
    documents: []
  })

  // Load real analytics data from localStorage
  useEffect(() => {
    const loadAnalytics = () => {
      try {
        const stored = localStorage.getItem('docuintel-analytics')
        if (stored) {
          const data = JSON.parse(stored)
          console.log(`🔍 [ANALYTICS] Loaded stored analytics:`, data);
          setAnalytics(data)
        } else {
          console.log(`🔍 [ANALYTICS] No stored analytics found - showing empty state`);
        }
      } catch (error) {
        console.error('Failed to load analytics:', error)
      }
    }

    loadAnalytics()
    
    // Refresh every 5 seconds to show real-time updates
    const interval = setInterval(loadAnalytics, 5000)
    return () => clearInterval(interval)
  }, [])

  const avgResponseTime = analytics.totalQuestions > 0 
    ? Math.round(analytics.totalResponseTime / analytics.totalQuestions)
    : 0

  const metrics = [
    {
      title: "Total Documents",
      value: analytics.documentsUploaded.toString(),
      description: "Documents processed",
      icon: FileText,
      trend: "+0%"
    },
    {
      title: "Questions Asked",
      value: analytics.totalQuestions.toString(),
      description: "AI interactions",
      icon: MessageSquare,
      trend: "+0%"
    },
    {
      title: "Time Saved",
      value: `${Math.round(analytics.timesSaved * 10) / 10}h`,
      description: "Estimated time savings",
      icon: Clock,
      trend: "+0%"
    },
    {
      title: "Avg Response Time",
      value: `${avgResponseTime}ms`,
      description: "AI response speed",
      icon: TrendingUp,
      trend: `${avgResponseTime}ms`
    }
  ]

  // Get question categories breakdown
  const categoryBreakdown = analytics.questions.reduce((acc, q) => {
    acc[q.category] = (acc[q.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.history.back()}
          className="h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Go back</span>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Track your document intelligence usage and insights
          </p>
        </div>
        <Button 
          variant="outline"
          onClick={() => {
            localStorage.removeItem('docuintel-analytics');
            setAnalytics({
              totalQuestions: 0,
              documentsUploaded: 0,
              timesSaved: 0,
              totalResponseTime: 0,
              questions: [],
              documents: []
            });
            console.log(`🔄 [ANALYTICS] Cache cleared - showing real state`);
          }}
        >
          Clear Cache
        </Button>
      </div>

      {/* Metrics grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <metric.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">
                {metric.description}
              </p>
              <div className="flex items-center pt-1">
                <Badge variant="secondary" className="text-xs">
                  {metric.trend}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts section */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Document Processing</CardTitle>
            <CardDescription>
              Documents processed over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                <p>No data available yet</p>
                <p className="text-sm">Upload documents to see analytics</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Question Categories</CardTitle>
            <CardDescription>
              Types of questions asked
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-2" />
                <p>No questions asked yet</p>
                <p className="text-sm">Start chatting to see insights</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity section */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your latest document intelligence activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[100px] text-muted-foreground">
            <div className="text-center">
              <Users className="h-8 w-8 mx-auto mb-2" />
              <p>No recent activity</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 