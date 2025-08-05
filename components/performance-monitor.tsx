"use client"

import { useEffect } from 'react'
import { usePerformanceMonitoring } from '@/hooks/use-performance'

export function PerformanceMonitor() {
  const { getMetrics, logMetrics } = usePerformanceMonitoring()

  useEffect(() => {
    // Log performance metrics every 30 seconds in development
    if (process.env.NODE_ENV === 'development') {
      const interval = setInterval(() => {
        const metrics = getMetrics()
        if (metrics.forcedReflows > 0 || metrics.longTasks > 0) {
          logMetrics()
        }
      }, 30000)

      return () => clearInterval(interval)
    }
  }, [getMetrics, logMetrics])

  // In production, only log critical issues
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      const interval = setInterval(() => {
        const metrics = getMetrics()
        if (metrics.forcedReflows > 5 || metrics.longTasks > 3) {
          console.error('🚨 Critical performance issues detected:', {
            forcedReflows: metrics.forcedReflows,
            longTasks: metrics.longTasks,
            memoryUsage: `${metrics.memoryUsage.toFixed(2)} MB`
          })
        }
      }, 60000) // Check every minute in production

      return () => clearInterval(interval)
    }
  }, [getMetrics])

  return null // This component doesn't render anything
} 