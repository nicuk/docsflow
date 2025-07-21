"use client"

import { Bell, ChevronDown, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useTenant } from "./tenant-provider"
import { getIndustryTheme } from "@/lib/tenant-themes"

export function TenantHeader() {
  const { currentTenant, availableTenants, setCurrentTenant } = useTenant()

  if (!currentTenant) return null

  const theme = getIndustryTheme(currentTenant.industry)

  return (
    <header className="border-b bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <img
              src={currentTenant.logo || "/placeholder.svg"}
              alt={`${currentTenant.name} logo`}
              className="h-8 w-8 rounded"
            />
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{currentTenant.name}</h1>
              <p className="text-sm text-gray-500">{currentTenant.subdomain}.leadrouter.com</p>
            </div>
          </div>
          <Badge variant="secondary" className="capitalize">
            {currentTenant.industry.replace("_", " ")}
          </Badge>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs"></span>
          </Button>

          {/* Tenant Switcher */}
          {availableTenants.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center space-x-2 bg-transparent">
                  <span>Switch Tenant</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {availableTenants.map((tenant) => (
                  <DropdownMenuItem
                    key={tenant.id}
                    onClick={() => setCurrentTenant(tenant)}
                    className="flex items-center space-x-3 p-3"
                  >
                    <img
                      src={tenant.logo || "/placeholder.svg"}
                      alt={`${tenant.name} logo`}
                      className="h-6 w-6 rounded"
                    />
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-sm text-gray-500">{tenant.subdomain}.leadrouter.com</p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
