"use client"

import { useState, useEffect, useMemo } from "react"
import type { Lead, FilterState } from "@/types/lead"
import { generateMockLeads } from "@/lib/mock-data"

const initialFilterState: FilterState = {
  status: [],
  channel: [],
  urgency: [],
  needsReview: false,
  dateRange: {},
  intents: [],
  assignedUsers: [],
  search: "",
}

export const useLeads = (industry: "motorcycle" | "warehouse" = "motorcycle") => {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FilterState>(initialFilterState)
  const [selectedRows, setSelectedRows] = useState<string[]>([])

  // Generate mock data
  useEffect(() => {
    const loadLeads = async () => {
      setLoading(true)
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      const mockLeads = generateMockLeads(150, industry)
      setLeads(mockLeads)
      setLoading(false)
    }

    loadLeads()
  }, [industry])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // In a real app, this would fetch new data
      console.log("Refreshing leads data...")
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // Filter leads based on current filters
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        const matchesSearch =
          lead.contactInfo.name.toLowerCase().includes(searchTerm) ||
          lead.contactInfo.email?.toLowerCase().includes(searchTerm) ||
          lead.contactInfo.phone?.includes(searchTerm) ||
          lead.content.toLowerCase().includes(searchTerm)

        if (!matchesSearch) return false
      }

      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(lead.status)) {
        return false
      }

      // Channel filter
      if (filters.channel.length > 0 && !filters.channel.includes(lead.channel)) {
        return false
      }

      // Urgency filter
      if (filters.urgency.length > 0) {
        const urgencyLevel = lead.urgencyScore > 0.7 ? "high" : lead.urgencyScore > 0.3 ? "medium" : "low"
        if (!filters.urgency.includes(urgencyLevel)) {
          return false
        }
      }

      // Needs review filter
      if (filters.needsReview && !lead.needsHuman) {
        return false
      }

      // Intent filter
      if (filters.intents.length > 0 && !filters.intents.includes(lead.intent.type)) {
        return false
      }

      // Assigned users filter
      if (filters.assignedUsers.length > 0) {
        if (!lead.assignedTo || !filters.assignedUsers.includes(lead.assignedTo.id)) {
          return false
        }
      }

      // Date range filter
      if (filters.dateRange.from || filters.dateRange.to) {
        const leadDate = new Date(lead.createdAt)
        if (filters.dateRange.from && leadDate < filters.dateRange.from) {
          return false
        }
        if (filters.dateRange.to && leadDate > filters.dateRange.to) {
          return false
        }
      }

      return true
    })
  }, [leads, filters])

  const updateFilters = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }

  const clearFilters = () => {
    setFilters(initialFilterState)
  }

  const bulkUpdateLeads = (leadIds: string[], updates: Partial<Lead>) => {
    setLeads((prev) => prev.map((lead) => (leadIds.includes(lead.id) ? { ...lead, ...updates } : lead)))
  }

  return {
    leads: filteredLeads,
    loading,
    filters,
    updateFilters,
    clearFilters,
    selectedRows,
    setSelectedRows,
    bulkUpdateLeads,
    totalCount: leads.length,
    filteredCount: filteredLeads.length,
  }
}
