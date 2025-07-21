"use client"

import { BarChart3, MessageSquare, Settings, Users, Zap, Home, TrendingUp } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useTenant } from "./tenant-provider"
import { getIndustryTheme } from "@/lib/tenant-themes"

const navigationItems = [
  { title: "Dashboard", icon: Home, url: "#" },
  { title: "Leads", icon: MessageSquare, url: "#" },
  { title: "Analytics", icon: BarChart3, url: "#" },
  { title: "Performance", icon: TrendingUp, url: "#" },
  { title: "Team", icon: Users, url: "#" },
  { title: "AI Settings", icon: Zap, url: "#" },
  { title: "Settings", icon: Settings, url: "#" },
]

export function DashboardSidebar() {
  const { currentTenant } = useTenant()

  if (!currentTenant) return null

  const theme = getIndustryTheme(currentTenant.industry)

  return (
    <Sidebar className={`border-r bg-${theme.secondary}`}>
      <SidebarHeader className="p-6">
        <div className="flex items-center space-x-3">
          <img
            src={currentTenant.logo || "/placeholder.svg"}
            alt={`${currentTenant.name} logo`}
            className="h-10 w-10 rounded"
          />
          <div>
            <h2 className="text-lg font-semibold text-white">Lead Router</h2>
            <p className="text-sm text-gray-300">AI-Powered Dashboard</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-300">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="text-gray-300 hover:text-white hover:bg-gray-700">
                    <a href={item.url} className="flex items-center space-x-3">
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-300">Quick Actions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {theme.quickActions.map((action) => (
                <SidebarMenuItem key={action}>
                  <SidebarMenuButton className="text-gray-300 hover:text-white hover:bg-gray-700">
                    {action}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-6">
        <div className="text-center">
          <p className="text-sm text-gray-400">{currentTenant.settings.businessHours}</p>
          <p className="text-xs text-gray-500">{currentTenant.settings.timezone}</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
