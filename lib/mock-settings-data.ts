import type { TenantSettings } from "@/types/settings"

export const generateMockSettings = (
  industry: "motorcycle_dealer" | "warehouse_distribution" = "motorcycle_dealer",
): TenantSettings => {
  const motorcycleIntents = ["Sales Inquiry", "Service Appointment", "Parts Request", "Financing", "Warranty"]
  const warehouseIntents = ["Quote Request", "Order Status", "Shipping Inquiry", "Supplier Question"]

  return {
    company: {
      name: industry === "motorcycle_dealer" ? "Thunder Motorcycles" : "QuickShip Logistics",
      industry,
      address: {
        street: "123 Main Street",
        city: "San Francisco",
        state: "CA",
        zipCode: "94105",
        country: "United States",
      },
      timezone: "America/Los_Angeles",
      businessHours: {
        monday: { isOpen: true, openTime: "09:00", closeTime: "18:00" },
        tuesday: { isOpen: true, openTime: "09:00", closeTime: "18:00" },
        wednesday: { isOpen: true, openTime: "09:00", closeTime: "18:00" },
        thursday: { isOpen: true, openTime: "09:00", closeTime: "18:00" },
        friday: { isOpen: true, openTime: "09:00", closeTime: "18:00" },
        saturday: { isOpen: true, openTime: "10:00", closeTime: "16:00" },
        sunday: { isOpen: false, openTime: "10:00", closeTime: "16:00" },
      },
      logo: "/placeholder.svg?height=80&width=80",
      contactInfo: {
        phone: "+1 (555) 123-4567",
        email: "info@company.com",
      },
      customization: {
        intentTypes: industry === "motorcycle_dealer" ? motorcycleIntents : warehouseIntents,
        urgencyKeywords: ["urgent", "emergency", "asap", "immediately", "critical"],
        customFields: [
          { name: "Vehicle Model", type: "text", required: false },
          {
            name: "Budget Range",
            type: "select",
            required: false,
            options: ["Under $10k", "$10k-$25k", "$25k-$50k", "Over $50k"],
          },
        ],
      },
    },
    channels: {
      whatsapp: {
        isConnected: true,
        phoneNumberId: "1234567890",
        accessToken: "EAAxxxxxxxxxxxxxxx",
        webhookVerifyToken: "verify_token_123",
        businessAccountId: "business_123",
        templates: [
          {
            id: "1",
            name: "Welcome Message",
            status: "approved",
            content: "Hello {{1}}, thank you for contacting us!",
            category: "utility",
          },
        ],
        rateLimits: {
          current: 850,
          limit: 1000,
        },
      },
      email: {
        inbound: {
          email: "leads@company.com",
          webhookUrl: "https://api.company.com/webhook/email",
          parsingRules: ["Extract phone numbers", "Identify intent keywords"],
        },
        outbound: {
          smtpConfig: {
            host: "smtp.gmail.com",
            port: 587,
            username: "noreply@company.com",
            password: "app_password",
            ssl: true,
          },
          fromName: "Company Support",
          fromEmail: "noreply@company.com",
          signature: "Best regards,\nThe Company Team",
          trackDelivery: true,
        },
      },
      forms: [
        {
          id: "1",
          name: "Contact Form",
          fields: [
            { id: "1", type: "text", label: "Full Name", required: true },
            { id: "2", type: "email", label: "Email Address", required: true },
            { id: "3", type: "phone", label: "Phone Number", required: false },
            { id: "4", type: "textarea", label: "Message", required: true },
          ],
          integrationCode: '<script src="https://forms.company.com/embed.js"></script>',
          analytics: {
            submissions: 245,
            sources: ["Website", "Landing Page", "Social Media"],
          },
          spamProtection: {
            captcha: true,
            keywords: ["spam", "bot", "fake"],
          },
        },
      ],
    },
    routing: [
      {
        id: "1",
        name: "High Urgency Sales",
        intent: ["Sales Inquiry"],
        conditions: {
          urgencyThreshold: 0.8,
          businessHoursOnly: false,
          keywords: ["urgent", "today", "asap"],
        },
        destination: {
          type: "user",
          value: "sarah@company.com",
        },
        priority: 1,
        isActive: true,
      },
      {
        id: "2",
        name: "Service Requests",
        intent: ["Service Appointment"],
        conditions: {
          urgencyThreshold: 0.5,
          businessHoursOnly: true,
        },
        destination: {
          type: "department",
          value: "service",
        },
        priority: 2,
        isActive: true,
      },
    ],
    templates: [
      {
        id: "1",
        name: "Sales Inquiry Response",
        intent: "Sales Inquiry",
        channel: "whatsapp",
        content:
          "Hi {customer_name}, thank you for your interest! I'd be happy to help you find the perfect {product_type}. When would be a good time to discuss your needs?",
        variables: ["customer_name", "product_type"],
        usage: {
          count: 156,
          responseRate: 0.78,
        },
        status: "active",
      },
    ],
    team: [
      {
        id: "1",
        name: "Sarah Johnson",
        email: "sarah@company.com",
        role: "Sales Manager",
        department: "Sales",
        status: "active",
        lastLogin: "2024-01-15T10:30:00Z",
        avatar: "/placeholder.svg?height=32&width=32",
        permissions: ["manage_leads", "edit_templates", "view_analytics"],
      },
      {
        id: "2",
        name: "Mike Wilson",
        email: "mike@company.com",
        role: "Service Agent",
        department: "Service",
        status: "active",
        lastLogin: "2024-01-15T09:15:00Z",
        avatar: "/placeholder.svg?height=32&width=32",
        permissions: ["manage_leads", "view_analytics"],
      },
    ],
    ai: {
      confidenceThresholds: {
        autoResponse: 0.8,
        humanReview: 0.4,
        escalation: 0.9,
      },
      fallbackBehavior: {
        action: "human_review",
        backupRules: ["Route to general queue", "Send generic response"],
        maxProcessingTime: 30,
      },
      models: {
        primary: "gpt-4o-mini",
        backup: "gemini-1.5-flash",
      },
      customPrompts: {
        classification: "You are an AI assistant helping classify customer inquiries for a {industry} business...",
        urgency: "Analyze the urgency of this customer message based on...",
      },
    },
    notifications: {
      alerts: [
        {
          type: "high_urgency",
          enabled: true,
          delay: 0,
          recipients: ["manager@company.com"],
        },
        {
          type: "sla_breach",
          enabled: true,
          delay: 0,
          recipients: ["manager@company.com", "admin@company.com"],
        },
      ],
      escalation: [
        {
          trigger: "No response in 2 hours",
          timeDelay: 120,
          escalateTo: ["manager@company.com"],
          conditions: ["Business hours", "High urgency"],
        },
      ],
      channels: {
        email: true,
        sms: false,
        slack: true,
        inApp: true,
      },
    },
  }
}
