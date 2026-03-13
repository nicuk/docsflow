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
    retry: (failureCount, error) => {
      // Retry auth errors up to 3 times with backoff
      if (error && (error as any).name === 'AuthError' && failureCount < 3) {
        
        return true;
      }
      return false;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000),
  })
}

export function useConversations(tenantId?: string) {
  return useQuery({
    queryKey: ['conversations', tenantId],
    queryFn: async () => {
      const { apiClient } = await import('@/lib/api-client')
      const response = await apiClient.getConversations()
      return response.conversations || []
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, error) => {
      // Retry auth errors up to 3 times with backoff
      if (error && (error as any).name === 'AuthError' && failureCount < 3) {
        return true;
      }
      return false;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
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
