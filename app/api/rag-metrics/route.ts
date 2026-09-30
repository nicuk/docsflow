import { NextRequest, NextResponse } from 'next/server';
import { ragMetrics } from '@/lib/rag-metrics';
import { validateTenantContext } from '@/lib/api-tenant-validation';
import { requireMember } from '@/lib/server-auth';

/*
 * Tenant admins see their own tenant's metrics and nothing else.
 *
 * The other views are platform-wide: `summary` and `report` aggregate every
 * tenant (the report names the busiest ones), `recent` returns the latest
 * queries of ALL tenants with their text, and clearing deletes every tenant's
 * metrics. Anyone can become a tenant admin by creating a workspace, so
 * "admin of this tenant" is not a gate for any of them; they are refused here
 * until there is a platform-operator role to gate them on.
 */
const PLATFORM_WIDE = 'This view covers every tenant and is not available to tenant admins';

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

    const check = await requireMember({ admin: true, tenantId });
    if (check instanceof NextResponse) return check;

    const view = request.nextUrl.searchParams.get('view') || 'tenant';

    switch (view) {
      case 'tenant': {
        const tenantMetrics = await ragMetrics.getTenantMetrics(tenantId);
        return NextResponse.json({ tenant: tenantMetrics, tenant_id: tenantId });
      }

      case 'summary':
      case 'recent':
      case 'report':
        return NextResponse.json({ error: PLATFORM_WIDE }, { status: 403 });

      default:
        return NextResponse.json(
          { error: 'Invalid view parameter. Use: tenant' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('RAG metrics GET failed:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve metrics' },
      { status: 500 }
    );
  }
}

// Clearing deletes every tenant's metrics (ragMetrics.clearMetrics has no
// tenant scope), so no tenant admin may do it.
export async function DELETE() {
  return NextResponse.json({ error: PLATFORM_WIDE }, { status: 403 });
}
