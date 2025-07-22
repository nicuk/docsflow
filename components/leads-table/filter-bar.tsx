"use client"

import { Search, Filter, X, AlertTriangle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import type { FilterState } from "@/types/lead"
import { mockUsers } from "@/lib/mock-data"

interface FilterBarProps {
  filters: FilterState
  onFiltersChange: (filters: Partial<FilterState>) => void
  onClearFilters: () => void
  industry: "motorcycle" | "warehouse"
}

export function FilterBar({ filters, onFiltersChange, onClearFilters, industry }: FilterBarProps) {
  const motorcycleIntents = ["Sales Inquiry", "Service Appointment", "Parts Request", "Financing", "Warranty"]
  const warehouseIntents = ["Quote Request", "Order Status", "Shipping Inquiry", "Supplier Question"]
  const intents = industry === "motorcycle" ? motorcycleIntents : warehouseIntents

  const activeFilterCount =
    filters.status.length +
    filters.channel.length +
    filters.urgency.length +
    filters.intents.length +
    filters.assignedUsers.length +
    (filters.needsReview ? 1 : 0) +
    (filters.search ? 1 : 0) +
    (filters.dateRange.from || filters.dateRange.to ? 1 : 0)

  const toggleArrayFilter = (key: keyof FilterState, value: string) => {
    const currentArray = filters[key] as string[]
    const newArray = currentArray.includes(value)
      ? currentArray.filter((item) => item !== value)
      : [...currentArray, value]
    onFiltersChange({ [key]: newArray })
  }

  return (
    <div className="space-y-4">
      {/* Search and Quick Actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search leads..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ search: e.target.value })}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <Button variant="outline" onClick={onClearFilters} size="sm">
              <X className="h-4 w-4 mr-2" />
              Clear Filters ({activeFilterCount})
            </Button>
          )}
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Status Filters */}
        {["new", "responded", "routed", "closed"].map((status) => (
          <Badge
            key={status}
            variant={filters.status.includes(status) ? "default" : "outline"}
            className="cursor-pointer capitalize"
            onClick={() => toggleArrayFilter("status", status)}
          >
            {status}
          </Badge>
        ))}

        {/* Channel Filters */}
        {["whatsapp", "email", "form"].map((channel) => (
          <Badge
            key={channel}
            variant={filters.channel.includes(channel) ? "default" : "outline"}
            className="cursor-pointer capitalize"
            onClick={() => toggleArrayFilter("channel", channel)}
          >
            {channel}
          </Badge>
        ))}

        {/* Urgency Filters */}
        {["high", "medium", "low"].map((urgency) => (
          <Badge
            key={urgency}
            variant={filters.urgency.includes(urgency) ? "default" : "outline"}
            className="cursor-pointer capitalize"
            onClick={() => toggleArrayFilter("urgency", urgency)}
          >
            {urgency} urgency
          </Badge>
        ))}

        {/* Needs Review Filter */}
        <Badge
          variant={filters.needsReview ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => onFiltersChange({ needsReview: !filters.needsReview })}
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          Needs Review
        </Badge>
      </div>

      {/* Advanced Filters */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Advanced Filters
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Intent Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Intent Types</label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {intents.map((intent) => (
                  <div key={intent} className="flex items-center space-x-2">
                    <Checkbox
                      id={intent}
                      checked={filters.intents.includes(intent)}
                      onCheckedChange={() => toggleArrayFilter("intents", intent)}
                    />
                    <label htmlFor={intent} className="text-sm">
                      {intent}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Assigned Users Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Assigned To</label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {mockUsers.map((user) => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={user.id}
                      checked={filters.assignedUsers.includes(user.id)}
                      onCheckedChange={() => toggleArrayFilter("assignedUsers", user.id)}
                    />
                    <label htmlFor={user.id} className="text-sm">
                      {user.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Select
                onValueChange={(value: string) => {
                  const now = new Date()
                  let from: Date | undefined

                  switch (value) {
                    case "24h":
                      from = new Date(now.getTime() - 24 * 60 * 60 * 1000)
                      break
                    case "7d":
                      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                      break
                    case "30d":
                      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
                      break
                    default:
                      from = undefined
                  }

                  onFiltersChange({ dateRange: { from, to: now } })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
