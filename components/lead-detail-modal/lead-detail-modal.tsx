"use client"

import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X, Minimize2, Phone, Mail, MessageSquare } from "lucide-react"
import { ConversationThread } from "./conversation-thread"
import { AIAnalysisPanel } from "./ai-analysis-panel"
import { ContactInfoPanel } from "./contact-info-panel"
import type { LeadDetail, ResponseTemplate } from "@/types/lead-detail"

interface LeadDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadDetail: LeadDetail | null
  industry?: "motorcycle" | "warehouse"
}

export function LeadDetailModal({ open, onOpenChange, leadDetail, industry = "motorcycle" }: LeadDetailModalProps) {
  if (!leadDetail) return null

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "whatsapp":
        return <MessageSquare className="h-4 w-4" />
      case "email":
        return <Mail className="h-4 w-4" />
      case "form":
        return <MessageSquare className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

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

  const handleSendResponse = (content: string, template?: ResponseTemplate) => {
    console.log("Sending response:", content, template)
    // In a real app, this would send the response via the appropriate channel
  }

  const handleAssign = (userId: string, reason: string) => {
    console.log("Assigning lead:", userId, reason)
    // In a real app, this would assign the lead to the user
  }

  const handleStatusChange = (status: string) => {
    console.log("Changing status:", status)
    // In a real app, this would update the lead status
  }

  const handleAddNote = (content: string, visibility: "team" | "private") => {
    console.log("Adding note:", content, visibility)
    // In a real app, this would add the note to the lead
  }

  const handlePinNote = (noteId: string) => {
    console.log("Pinning note:", noteId)
    // In a real app, this would pin/unpin the note
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] w-full h-[90vh] max-h-[90vh] p-0">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">{leadDetail.contactInfo.name}</h2>
                <Badge variant="outline" className="flex items-center gap-1">
                  {getChannelIcon(leadDetail.channel)}
                  {leadDetail.channel}
                </Badge>
                <Badge className={getStatusColor(leadDetail.status)}>{leadDetail.status}</Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                <span>Lead #{leadDetail.id}</span>
                <span>Created {new Date(leadDetail.createdAt).toLocaleString()}</span>
                {leadDetail.assignedTo && <span>Assigned to {leadDetail.assignedTo.name}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Contact Buttons */}
            {leadDetail.contactInfo.phone && (
              <Button variant="outline" size="sm" asChild>
                <a href={`tel:${leadDetail.contactInfo.phone}`}>
                  <Phone className="h-4 w-4 mr-1" />
                  Call
                </a>
              </Button>
            )}

            {leadDetail.contactInfo.email && (
              <Button variant="outline" size="sm" asChild>
                <a href={`mailto:${leadDetail.contactInfo.email}`}>
                  <Mail className="h-4 w-4 mr-1" />
                  Email
                </a>
              </Button>
            )}

            <Button variant="ghost" size="sm">
              <Minimize2 className="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Three-Column Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Conversation Thread (40%) */}
          <div className="w-[40%] border-r bg-white">
            <ConversationThread
              messages={leadDetail.conversation}
              onReply={(messageId) => console.log("Reply to:", messageId)}
            />
          </div>

          {/* Center Panel - AI Analysis & Actions (35%) */}
          <div className="w-[35%] border-r bg-gray-50 overflow-y-auto">
            <AIAnalysisPanel
              leadDetail={leadDetail}
              industry={industry}
              onSendResponse={handleSendResponse}
              onAssign={handleAssign}
              onStatusChange={handleStatusChange}
            />
          </div>

          {/* Right Panel - Contact Info & Notes (25%) */}
          <div className="w-[25%] bg-white overflow-y-auto">
            <ContactInfoPanel leadDetail={leadDetail} onAddNote={handleAddNote} onPinNote={handlePinNote} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
