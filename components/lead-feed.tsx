"use client"

import { MessageSquare, Mail, Globe, Phone } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { TenantLead } from "@/types/tenant"
import { useTenant } from "./tenant-provider"
import { getIndustryTheme } from "@/lib/tenant-themes"

interface LeadFeedProps {
  leads: TenantLead[]
}

export function LeadFeed({ leads }: LeadFeedProps) {
  const { currentTenant } = useTenant()

  if (!currentTenant) return null

  const theme = getIndustryTheme(currentTenant.industry)

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "whatsapp":
        return MessageSquare
      case "email":
        return Mail
      case "form":
        return Globe
      default:
        return MessageSquare
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800"
      case "contacted":
        return "bg-yellow-100 text-yellow-800"
      case "qualified":
        return "bg-green-100 text-green-800"
      case "converted":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Recent Leads</span>
          <Badge variant="secondary">{leads.length} Active</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {leads.map((lead) => {
          const SourceIcon = getSourceIcon(lead.source)

          return (
            <div key={lead.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-full bg-${theme.primary} bg-opacity-10`}>
                    <SourceIcon className={`h-4 w-4 text-${theme.primary}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900">{lead.name}</h4>
                      <Badge className={getStatusColor(lead.status)}>{lead.status}</Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                      <span className="flex items-center">
                        <Mail className="h-3 w-3 mr-1" />
                        {lead.email}
                      </span>
                      <span className="flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {lead.phone}
                      </span>
                    </div>
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">
                        {lead.intent}
                      </Badge>
                      <span className="ml-2 text-xs text-gray-500">
                        AI Confidence: {Math.round(lead.aiConfidence * 100)}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{lead.message}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <span className="text-xs text-gray-500">{lead.createdAt}</span>
                  <Button size="sm" className={`bg-${theme.primary} hover:bg-${theme.primary}/90`}>
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          )
        })}

        <div className="text-center pt-4">
          <Button variant="outline" className="w-full bg-transparent">
            View All Leads
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
