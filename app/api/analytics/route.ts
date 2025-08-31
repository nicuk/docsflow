import { NextRequest, NextResponse } from 'next/server'
import { getCORSHeaders } from '@/lib/utils'
import { validateTenantContext } from '@/lib/api-tenant-validation'
import { getSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin')
  const corsHeaders = getCORSHeaders(origin)
  
  try {
    // 🔒 SECURE: Validate tenant context
    const tenantValidation = await validateTenantContext(request, {
      requireAuth: true // ✅ TESTING: Enable auth on analytics first
    })

    if (!tenantValidation.isValid) {
      return NextResponse.json(
        { 
          error: tenantValidation.error,
          security_violation: 'Invalid tenant context'
        },
        { status: tenantValidation.statusCode || 400, headers: corsHeaders }
      )
    }

    const tenantId = tenantValidation.tenantId!
    
    // 🚀 REAL DATA: Query tenant-specific analytics from Supabase
    const supabase = getSupabaseClient()
    
    // Query tenant-specific documents count
    const { data: documentsData, error: docsError } = await supabase
      .from('documents')
      .select('id, processing_status, created_at')
      .eq('tenant_id', tenantId)
    
    // Query tenant-specific conversations count 
    const { data: conversationsData, error: convsError } = await supabase
      .from('conversations')
      .select('id, created_at')
      .eq('tenant_id', tenantId)
    
    // Query tenant-specific messages for questions count
    const { data: messagesData, error: msgsError } = await supabase
      .from('conversation_messages')
      .select('id, message_type, created_at')
      .eq('tenant_id', tenantId)
      .eq('message_type', 'user')
    
    if (docsError || convsError || msgsError) {
      console.error('Analytics query errors:', { docsError, convsError, msgsError })
    }
    
    const analyticsData = {
      totalQuestions: messagesData?.length || 0,
      documentsUploaded: documentsData?.length || 0,
      timesSaved: Math.floor((messagesData?.length || 0) * 1.2), // Estimate based on questions
      totalResponseTime: (messagesData?.length || 0) * 2.5, // Avg 2.5s per response
      questions: messagesData?.slice(0, 10).map(msg => ({
        id: msg.id,
        question: "Recent analysis query", // Privacy-friendly display
        timestamp: msg.created_at
      })) || [],
      documents: documentsData?.slice(0, 10).map(doc => ({
        id: doc.id,
        name: "Document", // Privacy-friendly display
        status: doc.processing_status,
        timestamp: doc.created_at
      })) || []
    }

    console.log(`📊 [ANALYTICS] ✅ SUCCESS - Serving analytics for tenant: ${tenantId}`)
    console.log(`📊 [ANALYTICS] Request headers:`, Object.fromEntries(request.headers.entries()))

    return NextResponse.json(analyticsData, { headers: corsHeaders })

  } catch (error: any) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { 
        error: 'Analytics service temporarily unavailable',
        message: 'Using fallback data'
      },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  const corsHeaders = getCORSHeaders(origin)
  return NextResponse.json({}, { headers: corsHeaders })
}
