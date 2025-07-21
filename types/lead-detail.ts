export interface LeadDetail {
  id: string
  contactInfo: {
    name: string
    phone?: string
    email?: string
    timezone?: string
    location?: string
  }
  conversation: Message[]
  aiAnalysis: {
    intent: {
      type: string
      confidence: number
      alternatives?: Array<{ type: string; confidence: number }>
    }
    urgency: {
      score: number
      factors: string[]
      recommendation: string
    }
    details: { [key: string]: any }
    reasoning: string
  }
  timeline: ActivityEvent[]
  notes: Note[]
  status: "new" | "responded" | "routed" | "closed"
  assignedTo?: User
  channel: "whatsapp" | "email" | "form"
  createdAt: string
  source: {
    channel: string
    referral?: string
    utmParams?: { [key: string]: string }
    firstTouchpoint: string
  }
}

export interface Message {
  id: string
  direction: "inbound" | "outbound" | "system"
  content: string
  channel: string
  timestamp: string
  author?: User
  isTemplate?: boolean
  isAutoResponse?: boolean
  mediaType?: "text" | "image" | "document" | "voice"
}

export interface ActivityEvent {
  id: string
  type: "created" | "analyzed" | "responded" | "status_changed" | "assigned" | "note_added"
  description: string
  timestamp: string
  user?: User
}

export interface Note {
  id: string
  content: string
  author: User
  timestamp: string
  isPinned: boolean
  visibility: "team" | "private"
}

export interface User {
  id: string
  name: string
  avatar?: string
  role?: string
}

export interface ResponseTemplate {
  id: string
  name: string
  content: string
  variables: string[]
  intent: string
  tone: "professional" | "friendly" | "urgent"
}
