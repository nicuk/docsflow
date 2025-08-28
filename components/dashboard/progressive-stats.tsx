"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { FileText, MessageSquare, Clock, TrendingUp } from "lucide-react"
import { useProgressiveLoading } from "@/hooks/use-progressive-loading"
import { useEffect, useState } from "react"

interface StatsData {
  totalDocuments: number
  questionsAsked: number  
  timeSaved: string
  avgResponseTime: string
}

const loadingStages = [
  { id: 'basic-counts', name: 'Loading document counts', delay: 200, priority: 1 },
  { id: 'questions', name: 'Loading question analytics', delay: 500, priority: 2 },
  { id: 'performance', name: 'Loading performance metrics', delay: 800, priority: 3 },
  { id: 'insights', name: 'Generating insights', delay: 1200, priority: 4 }
]

export function ProgressiveStats() {
  const { isStageComplete, isStageActive } = useProgressiveLoading({ 
    stages: loadingStages,
    autoStart: true 
  })
  
  const [stats, setStats] = useState<StatsData>({
    totalDocuments: 0,
    questionsAsked: 0,
    timeSaved: '0h', 
    avgResponseTime: '0ms'
  })

  // Simulate progressive data loading
  useEffect(() => {
    if (isStageComplete('basic-counts')) {
      setStats(prev => ({ ...prev, totalDocuments: 3 }))
    }
    
    if (isStageComplete('questions')) {
      setStats(prev => ({ ...prev, questionsAsked: 1 }))
    }
    
    if (isStageComplete('performance')) {
      setStats(prev => ({ ...prev, timeSaved: '1h', avgResponseTime: '0ms' }))
    }
  }, [isStageComplete])

  const statsCards = [
    {
      id: 'documents',
      title: 'Total Documents',
      value: stats.totalDocuments,
      icon: FileText,
      stage: 'basic-counts'
    },
    {
      id: 'questions', 
      title: 'Questions Asked',
      value: stats.questionsAsked,
      icon: MessageSquare,
      stage: 'questions'
    },
    {
      id: 'time-saved',
      title: 'Time Saved', 
      value: stats.timeSaved,
      icon: Clock,
      stage: 'performance'
    },
    {
      id: 'response-time',
      title: 'Avg Response Time',
      value: stats.avgResponseTime,
      icon: TrendingUp,
      stage: 'performance'
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsCards.map((card) => {
        const Icon = card.icon
        const isLoaded = isStageComplete(card.stage)
        const isLoading = isStageActive(card.stage)
        
        return (
          <Card key={card.id} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              {isLoaded ? (
                <p className="text-sm font-medium">{card.title}</p>
              ) : (
                <Skeleton className="h-4 w-24" />
              )}
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoaded ? (
                <>
                  <div className="text-2xl font-bold">{card.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {card.id === 'documents' && '+0% from last month'}
                    {card.id === 'questions' && '+0% from last month'}
                    {card.id === 'time-saved' && 'Estimated time savings'}
                    {card.id === 'response-time' && 'AI response speed'}
                  </p>
                </>
              ) : (
                <>
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </>
              )}
            </CardContent>
            
            {/* Shimmer effect while loading */}
            {isLoading && (
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            )}
          </Card>
        )
      })}
    </div>
  )
}
