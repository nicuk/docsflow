import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

// Document query configuration
export const documentsQueryKey = (tenantId?: string) => ['documents', tenantId]

export function useDocuments(tenantId?: string) {
  return useQuery({
    queryKey: documentsQueryKey(tenantId),
    queryFn: async () => {
      const response = await apiClient.getDocuments()
      return response.documents || []
    },
    enabled: !!tenantId, // Only run when tenantId is available
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useConversations(tenantId?: string) {
  return useQuery({
    queryKey: ['conversations', tenantId],
    queryFn: async () => {
      const response = await fetch('/api/conversations', {
        method: 'GET',
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to fetch conversations')
      const data = await response.json()
      return data.conversations || []
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

// Hook to prefetch documents (for preloading)
export function usePrefetchDocuments() {
  const queryClient = useQueryClient()
  
  return (tenantId: string) => {
    queryClient.prefetchQuery({
      queryKey: documentsQueryKey(tenantId),
      queryFn: async () => {
        const response = await apiClient.getDocuments()
        return response.documents || []
      },
      staleTime: 5 * 60 * 1000,
    })
  }
}
