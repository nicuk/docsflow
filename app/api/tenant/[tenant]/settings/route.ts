import { NextRequest, NextResponse } from 'next/server';
import { updateTenantMetadata, getSubdomainData } from '@/lib/subdomains';
import { auditLogger, AUDIT_ACTIONS } from '@/lib/audit-logger';
import { TenantSettings } from '@/lib/types/shared';

// Using frontend-compatible types
type TenantSettingsRequest = TenantSettings;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant } = await params;
    const settings: TenantSettingsRequest = await request.json();

    // Verify tenant exists
    const existingData = await getSubdomainData(tenant);
    if (!existingData) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

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
    console.error('Tenant settings update error:', error);
    
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

    return NextResponse.json({
      success: true,
      data: tenantData
    });

  } catch (error) {
    console.error('Tenant settings fetch error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}