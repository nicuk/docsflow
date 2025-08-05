import { createBrowserClient, createServerClient as createSSRServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

// Browser client for client-side operations
export const createSupabaseClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Simple client for basic operations (fallback)
export const getSupabaseClient = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Supabase configuration missing. Please check environment variables.');
  }
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

// Server client for server-side operations
export const createServerClient = (cookies: any) => {
  return createSSRServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookies.set({ name, value: '', ...options })
        },
      },
    }
  )
}

// Export the client instance
export const supabase = getSupabaseClient();

// Export default browser client
export default createSupabaseClient()
