'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'

interface QueryProviderProps {
  children: ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Create query client with optimized settings
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Cache documents for 5 minutes
        staleTime: 5 * 60 * 1000,
        // Keep in memory for 10 minutes  
        gcTime: 10 * 60 * 1000,
        // Retry failed requests
        retry: 2,
        // Refetch on window focus for fresh data
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
