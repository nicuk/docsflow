export interface TenantSettings {
  company: CompanySettings
  channels: ChannelSettings
  routing: RoutingRule[]
  templates: MessageTemplate[]
  team: User[]
  ai: AIConfiguration
  notifications: NotificationSettings
}

export interface CompanySettings {
  name: string
  industry: "motorcycle_dealer" | "warehouse_distribution" | "other"
  address: Address
  timezone: string
  businessHours: BusinessHours
  logo?: string
  contactInfo: {
    phone: string
    email: string
  }
  customization: {
    intentTypes: string[]
    urgencyKeywords: string[]
    customFields: CustomField[]
  }
}

export interface Address {
  street: string
  city: string
  state: string
  zipCode: string
  country: string
}

export interface BusinessHours {
  [key: string]: {
    isOpen: boolean
    openTime: string
    closeTime: string
  }
}

export interface ChannelSettings {
  whatsapp: WhatsAppConfig
  email: EmailConfig
  forms: FormConfig[]
}

export interface WhatsAppConfig {
  isConnected: boolean
  phoneNumberId: string
  accessToken: string
  webhookVerifyToken: string
  businessAccountId: string
  templates: WhatsAppTemplate[]
  rateLimits: {
    current: number
    limit: number
  }
}

export interface EmailConfig {
  inbound: {
    email: string
    imapConfig?: IMAPConfig
    webhookUrl: string
    parsingRules: string[]
  }
  outbound: {
    smtpConfig: SMTPConfig
    fromName: string
    fromEmail: string
    signature: string
    trackDelivery: boolean
  }
}

export interface FormConfig {
  id: string
  name: string
  fields: FormField[]
  integrationCode: string
  analytics: {
    submissions: number
    sources: string[]
  }
  spamProtection: {
    captcha: boolean
    keywords: string[]
  }
}

export interface RoutingRule {
  id: string
  name: string
  intent: string[]
  conditions: {
    urgencyThreshold?: number
    businessHoursOnly?: boolean
    keywords?: string[]
    channels?: string[]
  }
  destination: {
    type: "user" | "email" | "webhook" | "department"
    value: string
  }
  priority: number
  isActive: boolean
}

export interface MessageTemplate {
  id: string
  name: string
  intent: string
  channel: "whatsapp" | "email" | "all"
  content: string
  variables: string[]
  usage: {
    count: number
    responseRate: number
  }
  status: "active" | "pending" | "rejected"
}

export interface User {
  id: string
  name: string
  email: string
  role: string
  department: string
  status: "active" | "inactive"
  lastLogin?: string
  avatar?: string
  permissions: string[]
}

export interface AIConfiguration {
  confidenceThresholds: {
    autoResponse: number
    humanReview: number
    escalation: number
  }
  fallbackBehavior: {
    action: "human_review" | "generic_response"
    backupRules: string[]
    maxProcessingTime: number
  }
  models: {
    primary: string
    backup: string
  }
  customPrompts: {
    [key: string]: string
  }
}

export interface NotificationSettings {
  alerts: AlertConfig[]
  escalation: EscalationRule[]
  channels: {
    email: boolean
    sms: boolean
    slack: boolean
    inApp: boolean
  }
}

export interface AlertConfig {
  type: "high_urgency" | "low_confidence" | "sla_breach" | "system_error"
  enabled: boolean
  delay: number
  recipients: string[]
}

export interface EscalationRule {
  trigger: string
  timeDelay: number
  escalateTo: string[]
  conditions: string[]
}

export interface CustomField {
  name: string
  type: "text" | "number" | "select" | "boolean"
  required: boolean
  options?: string[]
}

export interface FormField {
  id: string
  type: "text" | "email" | "phone" | "textarea" | "select"
  label: string
  required: boolean
  options?: string[]
}

export interface WhatsAppTemplate {
  id: string
  name: string
  status: "approved" | "pending" | "rejected"
  content: string
  category: string
}

export interface IMAPConfig {
  host: string
  port: number
  username: string
  password: string
  ssl: boolean
}

export interface SMTPConfig {
  host: string
  port: number
  username: string
  password: string
  ssl: boolean
}
