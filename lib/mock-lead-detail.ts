import type { LeadDetail, ResponseTemplate } from "@/types/lead-detail"

export const mockResponseTemplates: ResponseTemplate[] = [
  {
    id: "1",
    name: "Schedule Test Ride",
    content:
      "Hi {customer_name}, thank you for your interest in our motorcycles! I'd be happy to schedule a test ride for you. We're available {business_hours}. What day works best for you?",
    variables: ["customer_name", "business_hours"],
    intent: "Sales Inquiry",
    tone: "friendly",
  },
  {
    id: "2",
    name: "Service Appointment",
    content:
      "Hello {customer_name}, I can help you schedule a service appointment. Based on your description, I recommend bringing your bike in within the next few days. Our service hours are {business_hours}.",
    variables: ["customer_name", "business_hours"],
    intent: "Service Appointment",
    tone: "professional",
  },
  {
    id: "3",
    name: "Parts Availability",
    content:
      "Hi {customer_name}, let me check our parts inventory for you. I'll get back to you within the hour with availability and pricing information.",
    variables: ["customer_name"],
    intent: "Parts Request",
    tone: "professional",
  },
  {
    id: "4",
    name: "Quote Preparation",
    content:
      "Hello {customer_name}, thank you for your quote request. I'll prepare a detailed quote based on your requirements and send it to you within 24 hours.",
    variables: ["customer_name"],
    intent: "Quote Request",
    tone: "professional",
  },
]

export const generateMockLeadDetail = (
  leadId: string,
  industry: "motorcycle" | "warehouse" = "motorcycle",
): LeadDetail => {
  const isMotorcycle = industry === "motorcycle"

  return {
    id: leadId,
    contactInfo: {
      name: "John Smith",
      phone: "+1 (555) 123-4567",
      email: "john.smith@example.com",
      timezone: "PST",
      location: "San Francisco, CA",
    },
    conversation: [
      {
        id: "msg-1",
        direction: "inbound",
        content: isMotorcycle
          ? "Hi, I'm interested in your latest motorcycle models. Can you tell me more about the pricing and availability? I'm particularly interested in sport bikes."
          : "I need a quote for shipping 500 units to California. What's your best rate for this volume?",
        channel: "whatsapp",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        mediaType: "text",
      },
      {
        id: "msg-2",
        direction: "system",
        content: "Lead automatically analyzed and classified",
        channel: "system",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 30000).toISOString(),
        mediaType: "text",
      },
      {
        id: "msg-3",
        direction: "outbound",
        content: isMotorcycle
          ? "Hello John! Thank you for your interest in our sport bikes. We have several excellent models available. I'd love to schedule a test ride for you. When would be a good time?"
          : "Hello John! Thank you for your quote request. I'll prepare a detailed shipping quote for 500 units to California and send it to you within 24 hours.",
        channel: "whatsapp",
        timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
        author: {
          id: "agent-1",
          name: "Sarah Johnson",
          avatar: "/placeholder.svg?height=32&width=32",
        },
        isTemplate: true,
        mediaType: "text",
      },
      {
        id: "msg-4",
        direction: "inbound",
        content: isMotorcycle
          ? "That sounds great! I'm available this weekend. Also, do you have any financing options available?"
          : "Perfect! Also, can you include expedited shipping options in the quote? We need this delivered by next Friday.",
        channel: "whatsapp",
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        mediaType: "text",
      },
    ],
    aiAnalysis: {
      intent: {
        type: isMotorcycle ? "Sales Inquiry" : "Quote Request",
        confidence: 0.94,
        alternatives: [
          { type: isMotorcycle ? "Financing" : "Shipping Inquiry", confidence: 0.78 },
          { type: isMotorcycle ? "Service Appointment" : "Order Status", confidence: 0.23 },
        ],
      },
      urgency: {
        score: 0.75,
        factors: [
          "Customer expressed immediate interest",
          "Mentioned specific timeline requirements",
          "Asked follow-up questions indicating serious intent",
        ],
        recommendation: "Respond within 15 minutes during business hours",
      },
      details: isMotorcycle
        ? {
            productInterest: "Sport bikes",
            timeline: "This weekend",
            additionalServices: "Financing options",
            customerType: "New customer",
          }
        : {
            volume: "500 units",
            destination: "California",
            timeline: "Next Friday",
            serviceType: "Expedited shipping",
          },
      reasoning: isMotorcycle
        ? "Customer shows high purchase intent with specific product interest (sport bikes) and immediate availability for test ride. The follow-up question about financing indicates serious buying consideration."
        : "Customer has specific volume requirements and tight timeline, indicating urgent business need. Request for expedited options suggests budget flexibility and serious intent.",
    },
    timeline: [
      {
        id: "event-1",
        type: "created",
        description: "Lead created from WhatsApp message",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "event-2",
        type: "analyzed",
        description: "AI analysis completed",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 30000).toISOString(),
      },
      {
        id: "event-3",
        type: "responded",
        description: "Initial response sent",
        timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
        user: {
          id: "agent-1",
          name: "Sarah Johnson",
          avatar: "/placeholder.svg?height=32&width=32",
        },
      },
    ],
    notes: [
      {
        id: "note-1",
        content: "Customer seems very interested in sport bikes. Mentioned weekend availability for test ride.",
        author: {
          id: "agent-1",
          name: "Sarah Johnson",
          avatar: "/placeholder.svg?height=32&width=32",
        },
        timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
        isPinned: false,
        visibility: "team",
      },
    ],
    status: "responded",
    assignedTo: {
      id: "agent-1",
      name: "Sarah Johnson",
      avatar: "/placeholder.svg?height=32&width=32",
      role: "Sales Agent",
    },
    channel: "whatsapp",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    source: {
      channel: "whatsapp",
      referral: "Google Ads",
      utmParams: {
        source: "google",
        medium: "cpc",
        campaign: "motorcycle-sales",
      },
      firstTouchpoint: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
  }
}
