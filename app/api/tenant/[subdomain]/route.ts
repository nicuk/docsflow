import { NextRequest, NextResponse } from 'next/server';
import { getSubdomainData } from '@/lib/subdomains';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  try {
    const { subdomain } = await params;
    
    if (!subdomain) {
      return NextResponse.json(
        { error: 'Subdomain is required' },
        { status: 400 }
      );
    }

    const tenantData = await getSubdomainData(subdomain);
    
    if (!tenantData) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      subdomain,
      emoji: tenantData.emoji,
      createdAt: tenantData.createdAt,
      leadCount: tenantData.leadCount,
      lastActivity: tenantData.lastActivity,
      aiEnabled: tenantData.aiEnabled,
      subscriptionTier: tenantData.subscriptionTier,
      settings: tenantData.settings,
      contactEmail: tenantData.contactEmail,
      displayName: tenantData.displayName
    });
  } catch (error) {
    console.error('Error fetching tenant data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 