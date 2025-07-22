"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Phone, Mail, MapPin, Clock, User, MessageSquare, Globe, Edit, Pin, Plus } from "lucide-react"
import { useState } from "react"
import type { LeadDetail } from "@/types/lead-detail"

interface ContactInfoPanelProps {
  leadDetail: LeadDetail
  onAddNote?: (content: string, visibility: "team" | "private") => void
  onPinNote?: (noteId: string) => void
}

export function ContactInfoPanel({ leadDetail, onAddNote, onPinNote }: ContactInfoPanelProps) {
  const [newNote, setNewNote] = useState("")
  const [noteVisibility, setNoteVisibility] = useState<"team" | "private">("team")

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "whatsapp":
        return <MessageSquare className="h-4 w-4" />
      case "email":
        return <Mail className="h-4 w-4" />
      case "form":
        return <Globe className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const handleAddNote = () => {
    if (newNote.trim()) {
      onAddNote?.(newNote, noteVisibility)
      setNewNote("")
    }
  }

  return (
    <div className="flex flex-col h-full space-y-4 p-4">
      {/* Contact Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-purple-600" />
            Contact Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">{leadDetail.contactInfo.name}</h3>
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {leadDetail.contactInfo.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <a href={`tel:${leadDetail.contactInfo.phone}`} className="text-blue-600 hover:underline">
                  {leadDetail.contactInfo.phone}
                </a>
              </div>
            )}

            {leadDetail.contactInfo.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <a href={`mailto:${leadDetail.contactInfo.email}`} className="text-blue-600 hover:underline">
                  {leadDetail.contactInfo.email}
                </a>
              </div>
            )}

            {leadDetail.contactInfo.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{leadDetail.contactInfo.location}</span>
              </div>
            )}

            {leadDetail.contactInfo.timezone && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{leadDetail.contactInfo.timezone}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lead Source */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Lead Source</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            {getChannelIcon(leadDetail.channel)}
            <Badge variant="outline" className="capitalize">
              {leadDetail.channel}
            </Badge>
          </div>

          {leadDetail.source.referral && (
            <div className="text-sm">
              <span className="font-medium">Referral: </span>
              <span className="text-gray-600">{leadDetail.source.referral}</span>
            </div>
          )}

          {leadDetail.source.utmParams && (
            <div className="text-sm space-y-1">
              <div className="font-medium">UTM Parameters:</div>
              {Object.entries(leadDetail.source.utmParams).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-500 capitalize">{key}:</span>
                  <span className="text-gray-600">{value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="text-sm">
            <span className="font-medium">First Contact: </span>
            <span className="text-gray-600">{formatTimestamp(leadDetail.source.firstTouchpoint)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-32">
            <div className="space-y-3">
              {leadDetail.timeline.map((event) => (
                <div key={event.id} className="flex gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{event.description}</div>
                    <div className="text-xs text-gray-500">
                      {formatTimestamp(event.timestamp)}
                      {event.user && ` • ${event.user.name}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="flex-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Internal Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Add Note */}
          <div className="space-y-2">
            <Textarea
              placeholder="Add a note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={2}
            />
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  variant={noteVisibility === "team" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNoteVisibility("team")}
                >
                  Team
                </Button>
                <Button
                  variant={noteVisibility === "private" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNoteVisibility("private")}
                >
                  Private
                </Button>
              </div>
              <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                Add Note
              </Button>
            </div>
          </div>

          <Separator />

          {/* Notes List */}
          <ScrollArea className="h-48">
            <div className="space-y-3">
              {leadDetail.notes.map((note) => (
                <div key={note.id} className="bg-gray-50 p-3 rounded">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={note.author.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{note.author.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{note.author.name}</span>
                      <Badge variant={note.visibility === "team" ? "default" : "secondary"}>
                        {note.visibility}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onPinNote?.(note.id)}
                      className={note.isPinned ? "text-yellow-600" : ""}
                    >
                      <Pin className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{note.content}</p>
                  <div className="text-xs text-gray-500">{formatTimestamp(note.timestamp)}</div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
