export interface Lead {
  id: string
  contactInfo: {
    name: string
    phone?: string
    email?: string
  }
  channel: "whatsapp" | "email" | "form"
  content: string
  intent: {
    type: string
    confidence: number
  }
  urgencyScore: number
  status: "new" | "responded" | "routed" | "closed"
  assignedTo?: {
    id: string
    name: string
    avatar?: string
  }
  needsHuman: boolean
  createdAt: string
  lastActivity: string
  responseTime?: number
}

export interface FilterState {
  status: string[]
  channel: string[]
  urgency: string[]
  needsReview: boolean
  dateRange: {
    from?: Date
    to?: Date
  }
  intents: string[]
  assignedUsers: string[]
  search: string
}

export interface User {
  id: string
  name: string
  avatar?: string
}
