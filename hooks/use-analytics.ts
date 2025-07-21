"use client"

import { useState, useEffect } from "react"
import type { AnalyticsData, TimePeriod } from "@/types/analytics"
import { generateMockAnalyticsData } from "@/lib/mock-analytics-data"

export const useAnalytics = (industry: "motorcycle" | "warehouse" = "motorcycle") => {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("30d")
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const loadData = async (period: TimePeriod) => {
    setLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const analyticsData = generateMockAnalyticsData(period, industry)
    setData(analyticsData)
    setLoading(false)
    setLastRefresh(new Date())
  }

  useEffect(() => {
    loadData(timePeriod)
  }, [timePeriod, industry])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadData(timePeriod)
    }, 60000)

    return () => clearInterval(interval)
  }, [timePeriod])

  const refresh = () => {
    loadData(timePeriod)
  }

  const changePeriod = (period: TimePeriod) => {
    setTimePeriod(period)
  }

  return {
    data,
    loading,
    timePeriod,
    lastRefresh,
    refresh,
    changePeriod,
  }
}
