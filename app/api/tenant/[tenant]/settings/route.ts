import { NextRequest, NextResponse } from 'next/server';
import { updateTenantMetadata, getSubdomainData } from '@/lib/subdomains';
import { auditLogger, AUDIT_ACTIONS } from '@/lib/audit-logger';
import { TenantSettings } from '@/lib/types/shared';
import { requireMember } from '@/lib/server-auth';

// Using frontend-compatible types
type TenantSettingsRequest = TenantSettings;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant } = await params;

    // Verify tenant exists
    const existingData = await getSubdomainData(tenant);
    if (!existingData) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Only an admin of this tenant may change its settings. This route used to
    // accept anyone, signed in or not, and it rewrites the contact email.
    const check = await requireMember({ admin: true, tenantId: existingData.id });
    if (check instanceof NextResponse) return check;

    const settings: TenantSettingsRequest = await request.json();

    // Update tenant metadata
    const updatedData = await updateTenantMetadata(tenant, {
      displayName: settings.displayName,
      contactEmail: settings.contactEmail,
      aiEnabled: settings.aiEnabled,
      settings: {
        ...existingData.settings,
        notifications: settings.notifications,
        description: settings.description,
        lastUpdated: Date.now()
      }
    });

    // Audit log the settings update
    auditLogger.logTenantAdminAction(
      AUDIT_ACTIONS.TENANT_SETTINGS_UPDATED,
      settings.contactEmail || 'unknown',
      tenant,
      {
        type: 'tenant',
        id: tenant
      },
      {
        changes: settings,
        previousSettings: existingData
      },
      'low'
    );

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      data: updatedData
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant } = await params;

    const tenantData = await getSubdomainData(tenant);
    
    if (!tenantData) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Settings include the contact email: members of the tenant only.
    const check = await requireMember({ tenantId: tenantData.id });
    if (check instanceof NextResponse) return check;

    return NextResponse.json({
      success: true,
      data: tenantData
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}