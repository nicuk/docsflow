"use client"

import { Button } from "@/components/ui/button"
import { Calendar, RefreshCw, Download, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { TimePeriod } from "@/types/analytics"

interface TimePeriodSelectorProps {
  currentPeriod: TimePeriod
  onPeriodChange: (period: TimePeriod) => void
  onRefresh: () => void
  lastRefresh: Date
  loading?: boolean
}

export function TimePeriodSelector({
  currentPeriod,
  onPeriodChange,
  onRefresh,
  lastRefresh,
  loading = false,
}: TimePeriodSelectorProps) {
  const periods: { value: TimePeriod; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "7d", label: "7 Days" },
    { value: "30d", label: "30 Days" },
    { value: "90d", label: "90 Days" },
    { value: "custom", label: "Custom" },
  ]

  const formatLastRefresh = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    return date.toLocaleTimeString()
  }

  const handleExport = (format: "pdf" | "csv") => {
    console.log(`Exporting as ${format}`)
    // In a real app, this would trigger the export
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <Badge variant="outline" className="text-xs">
          Last updated: {formatLastRefresh(lastRefresh)}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        {/* Time Period Buttons */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {periods.slice(0, 4).map((period) => (
            <Button
              key={period.value}
              variant={currentPeriod === period.value ? "default" : "ghost"}
              size="sm"
              onClick={() => onPeriodChange(period.value)}
              className="h-8"
            >
              {period.label}
            </Button>
          ))}
        </div>

        {/* Custom Date Range */}
        <Button variant="outline" size="sm" onClick={() => onPeriodChange("custom")}>
          <Calendar className="h-4 w-4 mr-2" />
          Custom
        </Button>

        {/* Refresh Button */}
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>

        {/* Export Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExport("pdf")}>
              <FileText className="h-4 w-4 mr-2" />
              PDF Report
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("csv")}>
              <Download className="h-4 w-4 mr-2" />
              CSV Data
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
