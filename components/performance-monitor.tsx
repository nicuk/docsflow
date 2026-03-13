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
        if (metrics.forcedReflows > 2 || metrics.longTasks > 1) {
          // Critical performance issues detected - metrics available via getMetrics()
        }
      }, 120000) // Check every 2 minutes in production (reduced frequency)

      return () => clearInterval(interval)
    }
  }, [getMetrics])

  return null // This component doesn't render anything
} 