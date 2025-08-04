"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import type { TenantContext as ImportedTenantContext } from "@/types/tenant"

interface TenantProviderContext {
  currentTenant: ImportedTenantContext | null
  setCurrentTenant: (tenant: ImportedTenantContext) => void
  availableTenants: ImportedTenantContext[]
  isLoading: boolean
  error: string | null
  refreshTenant: () => Promise<void>
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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Function to refresh tenant data from server
  const refreshTenant = async () => {
    if (!currentTenant?.subdomain) return
    
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/tenant/${currentTenant.subdomain}`)
      if (!response.ok) {
        throw new Error('Failed to refresh tenant data')
      }
      
      const updatedTenant = await response.json()
      setCurrentTenant(updatedTenant)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh tenant')
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-refresh tenant data when subdomain changes
  useEffect(() => {
    if (initialTenant && initialTenant !== currentTenant) {
      setCurrentTenant(initialTenant)
    }
  }, [initialTenant])

  return (
    <TenantProviderContext.Provider
      value={{
        currentTenant,
        setCurrentTenant,
        availableTenants: tenants,
        isLoading,
        error,
        refreshTenant,
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
