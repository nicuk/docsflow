import type { Lead, User } from "@/types/lead"

export const mockUsers: User[] = [
  { id: "1", name: "John Smith", avatar: "/placeholder.svg?height=32&width=32" },
  { id: "2", name: "Sarah Johnson", avatar: "/placeholder.svg?height=32&width=32" },
  { id: "3", name: "Mike Wilson", avatar: "/placeholder.svg?height=32&width=32" },
  { id: "4", name: "Lisa Chen", avatar: "/placeholder.svg?height=32&width=32" },
]

const motorcycleIntents = ["Sales Inquiry", "Service Appointment", "Parts Request", "Financing", "Warranty"]
const warehouseIntents = ["Quote Request", "Order Status", "Shipping Inquiry", "Supplier Question"]

const sampleMessages = [
  "Hi, I'm interested in your latest motorcycle models. Can you tell me more about the pricing and availability?",
  "I need to schedule a service appointment for my bike. The engine has been making strange noises lately.",
  "Do you have brake pads in stock for a 2019 Harley Davidson? I need them urgently.",
  "I'm looking for financing options for a new motorcycle purchase. What rates do you offer?",
  "My warranty is about to expire. Can you help me understand what's covered?",
  "I need a quote for shipping 500 units to California. What's your best rate?",
  "Can you provide an update on order #12345? It was supposed to arrive yesterday.",
  "I'm having issues with my recent shipment. Several items were damaged during transport.",
  "Looking for a reliable supplier for automotive parts. Do you have a catalog?",
]

export const generateMockLeads = (count = 100, industry: "motorcycle" | "warehouse" = "motorcycle"): Lead[] => {
  const intents = industry === "motorcycle" ? motorcycleIntents : warehouseIntents
  const leads: Lead[] = []

  for (let i = 0; i < count; i++) {
    const createdAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
    const urgencyScore = Math.random()
    const confidence = 0.3 + Math.random() * 0.7
    const status = ["new", "responded", "routed", "closed"][Math.floor(Math.random() * 4)] as Lead["status"]
    const channel = ["whatsapp", "email", "form"][Math.floor(Math.random() * 3)] as Lead["channel"]

    leads.push({
      id: `lead-${i + 1}`,
      contactInfo: {
        name: `Customer ${i + 1}`,
        phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        email: `customer${i + 1}@example.com`,
      },
      channel,
      content: sampleMessages[Math.floor(Math.random() * sampleMessages.length)],
      intent: {
        type: intents[Math.floor(Math.random() * intents.length)],
        confidence,
      },
      urgencyScore,
      status,
      assignedTo: Math.random() > 0.3 ? mockUsers[Math.floor(Math.random() * mockUsers.length)] : undefined,
      needsHuman: confidence < 0.7,
      createdAt: createdAt.toISOString(),
      lastActivity: new Date(createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000).toISOString(),
      responseTime: status !== "new" ? Math.floor(Math.random() * 120) + 5 : undefined,
    })
  }

  return leads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}
