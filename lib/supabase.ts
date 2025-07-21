import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
export type Tenant = {
  id: string
  subdomain: string
  name: string
  industry: 'motorcycle_dealer' | 'warehouse_distribution' | 'general'
  logo_url?: string
  theme: {
    primary: string
    secondary: string
    accent: string
  }
  settings: {
    businessHours: string
    timezone: string
    slaTarget: number
  }
  subscription_status: string
  plan_type: string
  created_at: string
  updated_at: string
}

export type Lead = {
  id: string
  tenant_id: string
  contact_name: string
  contact_email?: string
  contact_phone?: string
  source_channel: 'whatsapp' | 'email' | 'phone' | 'web' | 'walk_in'
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  industry_specific_data: any
  ai_analysis: any
  assigned_to?: string
  last_interaction_at: string
  conversion_value?: number
  notes?: string
  created_at: string
  updated_at: string
}

export type LeadInteraction = {
  id: string
  lead_id: string
  tenant_id: string
  interaction_type: 'message' | 'call' | 'email' | 'meeting' | 'note'
  direction: 'inbound' | 'outbound'
  content: string
  metadata: any
  ai_response: any
  responded_at?: string
  created_at: string
}

// Helper functions for tenant-aware queries
export async function getTenantBySubdomain(subdomain: string): Promise<Tenant | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('subdomain', subdomain)
    .single()

  if (error || !data) return null
  
  return data as Tenant
}

export async function getTenantLeads(tenantId: string, limit = 50) {
  const { data, error } = await supabase
    .from('leads')
    .select(`
      *,
      lead_interactions (
        id,
        interaction_type,
        direction,
        content,
        created_at
      )
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as (Lead & { lead_interactions: LeadInteraction[] })[]
}

export async function getTenantStats(tenantId: string) {
  const { data, error } = await supabase
    .rpc('get_tenant_stats', { tenant_uuid: tenantId })

  if (error) throw error
  return data[0]
}

// Real-time subscriptions
export function subscribeToTenantLeads(tenantId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`tenant-${tenantId}-leads`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'leads',
        filter: `tenant_id=eq.${tenantId}`
      },
      callback
    )
    .subscribe()
} 