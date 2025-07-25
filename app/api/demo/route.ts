import { NextRequest, NextResponse } from 'next/server';
import { supabase as supabaseClient } from '@/lib/supabase';

// CORS headers for demo endpoint
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
    ? 'https://v0-ai-saas-s-landing-page-1w.vercel.app,https://*.vercel.app,https://docsflow.app,https://*.docsflow.app' 
    : '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-ID, X-Requested-With, Accept',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET() {
  try {
    if (!supabaseClient) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503, headers: corsHeaders });
    }
    
    // Create demo tenant if it doesn't exist
    const { data: existingTenant } = await supabaseClient
      .from('tenants')
      .select('*')
      .eq('subdomain', 'demo')
      .single();
    
    if (!existingTenant) {
      // Create demo tenant
      const { data: tenant, error: tenantError } = await supabaseClient
        .from('tenants')
        .insert({
          name: 'Apex Distribution Demo',
          subdomain: 'demo',
          industry: 'warehouse_distribution',
          settings: {
            theme: 'default',
            features: ['chat', 'documents', 'analytics'],
            demo_mode: true
          }
        })
        .select()
        .single();
      
      if (tenantError) {
        console.error('Demo tenant creation error:', tenantError);
        return NextResponse.json({ error: 'Failed to create demo tenant' }, { status: 500, headers: corsHeaders });
      }
      
      // Create demo documents
      await createDemoDocuments(supabaseClient, tenant.id);
    }
    
    // Get demo tenant data
    const { data: demoTenant } = await supabaseClient
      .from('tenants')
      .select('*')
      .eq('subdomain', 'demo')
      .single();
    
    // Get demo documents count
    const { count: documentsCount } = await supabaseClient
      .from('documents')
      .select('*', { count: 'exact' })
      .eq('tenant_id', demoTenant.id);
    
    // Get demo conversations count  
    const { count: conversationsCount } = await supabaseClient
      .from('conversations')
      .select('*', { count: 'exact' })
      .eq('tenant_id', demoTenant.id);
    
    return NextResponse.json({
      success: true,
      tenant: demoTenant,
      stats: {
        documents: documentsCount || 0,
        conversations: conversationsCount || 0,
        users: 1, // Demo user
      },
      message: 'Demo environment ready'
    }, { headers: corsHeaders });
    
  } catch (error) {
    console.error('Demo setup error:', error);
    return NextResponse.json({ 
      error: 'Demo setup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500, headers: corsHeaders });
  }
}

async function createDemoDocuments(supabase: any, tenantId: string) {
  const demoDocuments = [
    {
      tenant_id: tenantId,
      filename: 'Warehouse Operations Manual.pdf',
      file_type: 'application/pdf',
      file_size: 2500000,
      content_preview: 'Comprehensive guide to warehouse operations, inventory management, and distribution protocols...',
      processing_status: 'completed',
      access_level: 2,
      metadata: {
        category: 'operations',
        department: 'warehouse',
        confidentiality: 'internal'
      }
    },
    {
      tenant_id: tenantId,
      filename: 'Supplier Performance Q4.xlsx',
      file_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      file_size: 850000,
      content_preview: 'Q4 supplier performance metrics, delivery times, quality scores, and cost analysis...',
      processing_status: 'completed',
      access_level: 3,
      metadata: {
        category: 'analytics',
        department: 'procurement',
        confidentiality: 'restricted'
      }
    },
    {
      tenant_id: tenantId,
      filename: 'Safety Protocols.pdf',
      file_type: 'application/pdf',
      file_size: 1200000,
      content_preview: 'Safety protocols for warehouse operations, emergency procedures, and compliance requirements...',
      processing_status: 'completed',
      access_level: 1,
      metadata: {
        category: 'safety',
        department: 'operations',
        confidentiality: 'public'
      }
    }
  ];
  
  for (const doc of demoDocuments) {
    await supabase.from('documents').insert(doc);
  }
} 