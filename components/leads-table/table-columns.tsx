"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Phone, Mail, MessageSquare, Globe, AlertTriangle, User, Clock, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Lead } from "@/types/lead"
import { mockUsers } from "@/lib/mock-data"

export const createColumns = (onLeadUpdate: (leadId: string, updates: Partial<Lead>) => void): ColumnDef<Lead>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value: boolean) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value: boolean) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "contactInfo",
    header: "Contact",
    cell: ({ row }) => {
      const lead = row.original
      const getChannelIcon = () => {
        switch (lead.channel) {
          case "whatsapp":
            return <MessageSquare className="h-3 w-3" />
          case "email":
            return <Mail className="h-3 w-3" />
          case "form":
            return <Globe className="h-3 w-3" />
        }
      }

      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{lead.contactInfo.name}</span>
            <Badge variant="outline" className="h-5 px-1">
              {getChannelIcon()}
            </Badge>
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            {lead.contactInfo.phone && (
              <div className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                <a href={`tel:${lead.contactInfo.phone}`} className="hover:underline">
                  {lead.contactInfo.phone}
                </a>
              </div>
            )}
            {lead.contactInfo.email && (
              <div className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                <a href={`mailto:${lead.contactInfo.email}`} className="hover:underline">
                  {lead.contactInfo.email}
                </a>
              </div>
            )}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "content",
    header: "Message",
    cell: ({ row }) => {
      const content = row.original.content
      const truncated = content.length > 80 ? content.substring(0, 80) + "..." : content

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="max-w-xs cursor-help">
                <p className="text-sm">{truncated}</p>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <p>{content}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    },
  },
  {
    accessorKey: "intent",
    header: "Intent",
    cell: ({ row }) => {
      const { intent } = row.original
      const getIntentColor = (type: string) => {
        if (type.includes("Sales") || type.includes("Quote")) return "bg-blue-100 text-blue-800"
        if (type.includes("Service") || type.includes("Order")) return "bg-green-100 text-green-800"
        if (type.includes("Parts") || type.includes("Shipping")) return "bg-orange-100 text-orange-800"
        return "bg-gray-100 text-gray-800"
      }

      return (
        <div className="space-y-1">
          <Badge className={getIntentColor(intent.type)}>{intent.type}</Badge>
          <div className="text-xs text-gray-500">{Math.round(intent.confidence * 100)}% confidence</div>
        </div>
      )
    },
  },
  {
    accessorKey: "urgencyScore",
    header: "Urgency",
    cell: ({ row }) => {
      const score = row.original.urgencyScore
      const percentage = Math.round(score * 100)
      const getColor = () => {
        if (score > 0.7) return "bg-red-500"
        if (score > 0.3) return "bg-yellow-500"
        return "bg-green-500"
      }

      return (
        <div className="space-y-1">
          <div className="relative">
            <Progress value={percentage} className="h-2" />
            <div className={`absolute inset-0 h-2 rounded-full ${getColor()}`} style={{ width: `${percentage}%` }} />
          </div>
          <div className="text-xs text-center">{percentage}%</div>
        </div>
      )
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const lead = row.original
      const getStatusColor = (status: string) => {
        switch (status) {
          case "new":
            return "bg-blue-100 text-blue-800"
          case "responded":
            return "bg-green-100 text-green-800"
          case "routed":
            return "bg-purple-100 text-purple-800"
          case "closed":
            return "bg-gray-100 text-gray-800"
          default:
            return "bg-gray-100 text-gray-800"
        }
      }

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-auto p-0">
              <Badge className={`${getStatusColor(lead.status)} cursor-pointer`}>
                {lead.status}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {["new", "responded", "routed", "closed"].map((status) => (
              <DropdownMenuItem
                key={status}
                onClick={() => onLeadUpdate(lead.id, { status: status as Lead["status"] })}
              >
                <Badge className={getStatusColor(status)}>{status}</Badge>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
  {
    accessorKey: "assignedTo",
    header: "Assigned To",
    cell: ({ row }) => {
      const lead = row.original

      if (!lead.assignedTo) {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <User className="h-4 w-4 mr-2" />
                Assign
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {mockUsers.map((user) => (
                <DropdownMenuItem key={user.id} onClick={() => onLeadUpdate(lead.id, { assignedTo: user })}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.avatar || "/placeholder.svg"} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {user.name}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-auto p-1">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={lead.assignedTo.avatar || "/placeholder.svg"} />
                  <AvatarFallback>{lead.assignedTo.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{lead.assignedTo.name}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {mockUsers.map((user) => (
              <DropdownMenuItem key={user.id} onClick={() => onLeadUpdate(lead.id, { assignedTo: user })}>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatar || "/placeholder.svg"} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {user.name}
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={() => onLeadUpdate(lead.id, { assignedTo: undefined })}>
              Unassign
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
  {
    accessorKey: "intent.confidence",
    header: "AI Confidence",
    cell: ({ row }) => {
      const lead = row.original
      const confidence = Math.round(lead.intent.confidence * 100)
      const getColor = () => {
        if (confidence > 80) return "text-green-600"
        if (confidence > 60) return "text-yellow-600"
        return "text-red-600"
      }

      return (
        <div className="space-y-1">
          <div className={`font-medium ${getColor()}`}>{confidence}%</div>
          {lead.needsHuman && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Needs Human
            </Badge>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => {
      const createdAt = new Date(row.original.createdAt)
      const now = new Date()
      const diffMs = now.getTime() - createdAt.getTime()
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffHours / 24)

      const getRelativeTime = () => {
        if (diffDays > 0) return `${diffDays}d ago`
        if (diffHours > 0) return `${diffHours}h ago`
        return "Just now"
      }

      const isUrgent = row.original.status === "new" && diffHours > 2

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-1">
                <div className={`text-sm ${isUrgent ? "text-red-600 font-medium" : ""}`}>{getRelativeTime()}</div>
                {isUrgent && (
                  <Badge variant="destructive" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    Urgent
                  </Badge>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{createdAt.toLocaleString()}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    },
  },
]
