"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Building2, MessageSquare, GitBranch, FileText, Users, Brain, Bell, CreditCard, Activity } from "lucide-react"

interface SettingsSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function SettingsSidebar({ activeTab, onTabChange }: SettingsSidebarProps) {
  const menuItems = [
    {
      id: "company",
      label: "Company Settings",
      icon: Building2,
      description: "Business profile and hours",
    },
    {
      id: "channels",
      label: "Channel Configuration",
      icon: MessageSquare,
      description: "WhatsApp, Email, Forms",
      badge: "3 Connected",
    },
    {
      id: "routing",
      label: "Routing Rules",
      icon: GitBranch,
      description: "AI routing and assignments",
      badge: "5 Rules",
    },
    {
      id: "templates",
      label: "Response Templates",
      icon: FileText,
      description: "Message templates",
      badge: "12 Templates",
    },
    {
      id: "team",
      label: "Team Management",
      icon: Users,
      description: "Users and permissions",
      badge: "8 Users",
    },
    {
      id: "ai",
      label: "AI Configuration",
      icon: Brain,
      description: "AI settings and thresholds",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      description: "Alerts and escalations",
    },
    {
      id: "billing",
      label: "Billing & Plan",
      icon: CreditCard,
      description: "Subscription and usage",
    },
    {
      id: "health",
      label: "System Health",
      icon: Activity,
      description: "Diagnostics and monitoring",
    },
  ]

  return (
    <div className="w-64 bg-white border-r h-full p-4">
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Settings</h2>
        <p className="text-sm text-gray-600">Configure your AI Lead Router</p>
      </div>

      <nav className="space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          return (
            <Button
              key={item.id}
              variant={isActive ? "default" : "ghost"}
              className={`w-full justify-start h-auto p-3 ${isActive ? "" : "hover:bg-gray-50"}`}
              onClick={() => onTabChange(item.id)}
            >
              <div className="flex items-center gap-3 w-full">
                <Icon className="h-4 w-4 flex-shrink-0" />
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm">{item.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                </div>
                {item.badge && (
                  <Badge variant="secondary" className="text-xs">
                    {item.badge}
                  </Badge>
                )}
              </div>
            </Button>
          )
        })}
      </nav>
    </div>
  )
}
