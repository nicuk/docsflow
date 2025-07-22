"use client"

import { MessageSquare, CheckCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { mockUsers } from "@/lib/mock-data"
import type { Lead } from "@/types/lead"

interface BulkActionsBarProps {
  selectedCount: number
  onClearSelection: () => void
  onBulkUpdate: (updates: Partial<Lead>) => void
}

export function BulkActionsBar({ selectedCount, onClearSelection, onBulkUpdate }: BulkActionsBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{selectedCount} selected</Badge>
            <Button variant="ghost" size="sm" onClick={onClearSelection}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Assign User */}
            <Select
              onValueChange={(userId: string) => {
                const user = mockUsers.find((u) => u.id === userId)
                if (user) {
                  onBulkUpdate({ assignedTo: user })
                }
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Assign to..." />
              </SelectTrigger>
              <SelectContent>
                {mockUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <img src={user.avatar || "/placeholder.svg"} alt={user.name} className="h-4 w-4 rounded-full" />
                      {user.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Change Status */}
            <Select
              onValueChange={(status: string) => {
                onBulkUpdate({ status: status as Lead["status"] })
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Change status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="responded">Responded</SelectItem>
                <SelectItem value="routed">Routed</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            {/* Quick Actions */}
            <Button variant="outline" size="sm" onClick={() => onBulkUpdate({ status: "responded" })}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Mark Responded
            </Button>

            <Button variant="outline" size="sm" onClick={() => onBulkUpdate({ status: "closed" })}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark Closed
            </Button>
          </div>
        </div>

        <Button variant="outline" size="sm">
          Export Selected
        </Button>
      </div>
    </div>
  )
}
