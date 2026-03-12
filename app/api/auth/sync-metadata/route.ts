import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

/**
 * 🔄 METADATA SYNC ENDPOINT
 * Fixes out-of-sync Clerk metadata by querying database
 * 
 * Use case: User has tenant in DB but Clerk metadata is missing/outdated
 */
export async function POST(request: NextRequest) {
  try {
    const { subdomain } = await request.json();
    
    if (!subdomain) {
      return NextResponse.json(
        { error: 'Subdomain is required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const { userId } = await auth();
    const user = await currentUser();
    
    if (!userId || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userEmail = user.emailAddresses[0]?.emailAddress || '';

    console.log('🔄 [METADATA SYNC] Starting sync for:', {
      userId,
      email: userEmail,
      subdomain,
    });

    // Initialize Supabase with service role
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get tenant from database by subdomain
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('id, subdomain, name, industry')
      .eq('subdomain', subdomain)
      .single();

    if (tenantError || !tenant) {
      console.error('❌ [METADATA SYNC] Tenant not found:', tenantError);
      return NextResponse.json(
        { error: 'Tenant not found for subdomain' },
        { status: 404 }
      );
    }

    // Get user from database to verify they belong to this tenant
    const { data: dbUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, role, access_level')
      .eq('email', userEmail)
      .eq('tenant_id', tenant.id)
      .single();

    if (userError || !dbUser) {
      console.error('❌ [METADATA SYNC] User not found in tenant:', userError);
      return NextResponse.json(
        { error: 'User not found in this tenant' },
        { status: 404 }
      );
    }

    console.log('✅ [METADATA SYNC] Found user and tenant:', {
      tenantId: tenant.id,
      tenantName: tenant.name,
      userRole: dbUser.role,
      accessLevel: dbUser.access_level,
    });

    // Update user metadata with correct tenant info
    const clerk = await clerkClient();
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: {
        tenantId: tenant.id,
        tenantSubdomain: tenant.subdomain,
        tenantName: tenant.name,
        role: dbUser.role,
        accessLevel: dbUser.access_level,
        onboardingComplete: true,
        supabaseUserId: dbUser.id,
        lastSynced: new Date().toISOString(),
      }
    });

    console.log('✅ [METADATA SYNC] Clerk metadata updated successfully');

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        subdomain: tenant.subdomain,
        name: tenant.name,
      },
      user: {
        role: dbUser.role,
        accessLevel: dbUser.access_level,
      }
    });

  } catch (error) {
    console.error('❌ [METADATA SYNC] Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Metadata sync failed',
      },
      { status: 500 }
    );
  }
}

