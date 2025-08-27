import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

// Browser client for client-side operations with proper cookie configuration
export const createSupabaseClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // SSR-safe cookie access
          if (typeof document === 'undefined') return [];
          return document.cookie
            .split(';')
            .map(cookie => {
              const [name, ...rest] = cookie.trim().split('=')
              return { name, value: rest.join('=') }
            })
        },
        setAll(cookiesToSet) {
          // SSR-safe cookie setting
          if (typeof document === 'undefined') return;
          cookiesToSet.forEach(({ name, value, options }) => {
            let cookieString = `${name}=${value}`
            
            if (options?.maxAge) {
              cookieString += `; Max-Age=${options.maxAge}`
            }
            if (options?.expires) {
              cookieString += `; Expires=${options.expires.toUTCString()}`
            }
            if (options?.domain) {
              cookieString += `; Domain=${options.domain}`
            }
            if (options?.path) {
              cookieString += `; Path=${options.path}`
            }
            if (options?.secure) {
              cookieString += '; Secure'
            }
            if (options?.httpOnly) {
              cookieString += '; HttpOnly'
            }
            if (options?.sameSite) {
              cookieString += `; SameSite=${options.sameSite}`
            }
            
            document.cookie = cookieString
          })
        },
      },
    }
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

// Export the client instance
export const supabase = getSupabaseClient();

// Server client for SSR operations
export { createServerClient }

// Export singleton browser client
let browserClient: ReturnType<typeof createSupabaseClient> | null = null

export const getSupabaseBrowserClient = () => {
  if (!browserClient) {
    browserClient = createSupabaseClient()
  }
  return browserClient
}

export default getSupabaseBrowserClient()
