"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"
import type { TenantContext as ImportedTenantContext } from "@/types/tenant"

interface TenantProviderContext {
  currentTenant: ImportedTenantContext | null
  setCurrentTenant: (tenant: ImportedTenantContext) => void
  availableTenants: ImportedTenantContext[]
}

const TenantProviderContext = createContext<TenantProviderContext | undefined>(undefined)

export function TenantProvider({
  children,
  initialTenant,
  tenants,
}: {
  children: React.ReactNode
  initialTenant: ImportedTenantContext | null
  tenants: ImportedTenantContext[]
}) {
  const [currentTenant, setCurrentTenant] = useState<ImportedTenantContext | null>(initialTenant)

  return (
    <TenantProviderContext.Provider
      value={{
        currentTenant,
        setCurrentTenant,
        availableTenants: tenants,
      }}
    >
      {children}
    </TenantProviderContext.Provider>
  )
}

export function useTenant() {
  const context = useContext(TenantProviderContext)
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider")
  }
  return context
}
