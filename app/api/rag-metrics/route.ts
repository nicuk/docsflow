import { NextRequest, NextResponse } from 'next/server';
import { ragMetrics } from '@/lib/rag-metrics';
import { validateTenantContext } from '@/lib/api-tenant-validation';
import { getUserAccessLevel } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    // Validate tenant context
    const tenantValidation = await validateTenantContext(request);
    if (!tenantValidation.isValid) {
      return NextResponse.json(
        { error: tenantValidation.error },
        { status: tenantValidation.statusCode || 400 }
      );
    }

    const { tenantId } = tenantValidation;
    const userId = 'system';

    // Check if user is admin (access level 1)
    const accessLevel = await getUserAccessLevel(request, tenantId);
    if (accessLevel > 1) {
      return NextResponse.json(
        { error: 'Admin access required to view metrics' },
        { status: 403 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const view = searchParams.get('view') || 'summary';

    let response: any = {};

    switch (view) {
      case 'summary':
        // Get system-wide metrics
        const systemMetrics = await ragMetrics.getSystemMetrics();
        response = {
          system: systemMetrics,
          status: systemMetrics ? 'healthy' : 'initializing'
        };
        break;

      case 'tenant':
        // Get tenant-specific metrics
        const tenantMetrics = await ragMetrics.getTenantMetrics(tenantId);
        response = {
          tenant: tenantMetrics,
          tenant_id: tenantId
        };
        break;

      case 'recent':
        // Get recent queries
        const limit = parseInt(searchParams.get('limit') || '10');
        const recentQueries = await ragMetrics.getRecentQueries(limit);
        response = {
          queries: recentQueries,
          count: recentQueries.length
        };
        break;

      case 'report':
        // Generate comprehensive performance report
        const report = await ragMetrics.generatePerformanceReport();
        response = report;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid view parameter. Use: summary, tenant, recent, or report' },
          { status: 400 }
        );
    }

    return NextResponse.json(response);

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to retrieve metrics' },
      { status: 500 }
    );
  }
}

// Clear metrics (admin only, use with caution)
export async function DELETE(request: NextRequest) {
  try {
    // Validate tenant context
    const tenantValidation = await validateTenantContext(request);
    if (!tenantValidation.isValid) {
      return NextResponse.json(
        { error: tenantValidation.error },
        { status: tenantValidation.statusCode || 400 }
      );
    }

    const { tenantId } = tenantValidation;
    const userId = 'system';

    // Check if user is admin
    const accessLevel = await getUserAccessLevel(request, tenantId);
    if (accessLevel > 1) {
      return NextResponse.json(
        { error: 'Admin access required to clear metrics' },
        { status: 403 }
      );
    }

    // Clear all metrics
    await ragMetrics.clearMetrics();

    return NextResponse.json({
      success: true,
      message: 'All metrics cleared successfully'
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to clear metrics' },
      { status: 500 }
    );
  }
}
