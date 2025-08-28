import { NextRequest, NextResponse } from 'next/server'
import { getCORSHeaders } from '@/lib/utils'
import { validateTenantContext } from '@/lib/api-tenant-validation'

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin')
  const corsHeaders = getCORSHeaders(origin)
  
  try {
    // 🔒 SECURE: Validate tenant context
    const tenantValidation = await validateTenantContext(request, {
      requireAuth: false
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
    
    // 🚀 QUICK FIX: Return mock analytics data to prevent 404s
    // TODO: Replace with real Supabase analytics queries
    const mockAnalytics = {
      totalDocuments: 3,
      questionsAsked: 1, 
      timeSaved: "1h",
      avgResponseTime: "0ms",
      documentProcessing: {
        thisWeek: [2, 1, 0, 0, 0, 0, 0],
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      },
      questionCategories: {
        "Document Analysis": 45,
        "Business Insights": 30,
        "Decision Support": 25
      },
      recentActivity: [
        {
          type: 'document_upload',
          message: 'Uploaded Financial Report Q3 2023.pdf',
          timestamp: new Date().toISOString()
        },
        {
          type: 'question_asked', 
          message: 'Asked about quarterly revenue trends',
          timestamp: new Date(Date.now() - 3600000).toISOString()
        }
      ]
    }

    console.log(`📊 [ANALYTICS] ✅ SUCCESS - Serving analytics for tenant: ${tenantId}`)
    console.log(`📊 [ANALYTICS] Request headers:`, Object.fromEntries(request.headers.entries()))

    return NextResponse.json({
      success: true,
      analytics: mockAnalytics,
      tenantId,
      generatedAt: new Date().toISOString()
    }, { headers: corsHeaders })

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
