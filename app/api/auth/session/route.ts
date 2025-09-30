import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';

/**
 * 🎯 CLERK MIGRATION: Session API
 * Provides authentication state for client-side components
 * Now uses Clerk instead of Supabase for auth
 */
export async function GET(request: NextRequest) {
  try {
    // Check if this is a Vercel bot request (skip logging for bots)
    const userAgent = request.headers.get('user-agent') || '';
    const isVercelBot = userAgent.includes('vercel-bot') || userAgent.includes('bot');

    if (!isVercelBot) {
      console.log(`🔍 [SESSION API] Request received from: ${request.headers.get('referer') || 'direct'}`);
    }

    // 🎯 CLERK: Get authentication state
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      if (!isVercelBot) {
        console.log(`❌ [SESSION API] No authenticated Clerk user`);
      }
      
      return NextResponse.json({
        authenticated: false,
        user: null,
        tenant: null,
        onboardingComplete: false,
      });
    }

    // Extract user data from Clerk
    const email = user.emailAddresses[0]?.emailAddress || '';
    const name = user.firstName || email.split('@')[0] || 'User';
    const role = (user.publicMetadata?.role as string) || 'member';
    
    // Extract tenant data from metadata
    const tenantId = (user.publicMetadata?.tenantId as string) || null;
    const tenantSubdomain = (user.publicMetadata?.tenantSubdomain as string) || null;
    const tenantName = (user.publicMetadata?.tenantName as string) || null;
    const onboardingComplete = (user.publicMetadata?.onboardingComplete as boolean) || false;

    const responseData = {
      authenticated: true,
      user: {
        id: userId,
        email,
        name,
        role,
      },
      tenant: tenantId ? {
        id: tenantId,
        subdomain: tenantSubdomain,
        name: tenantName,
      } : null,
      onboardingComplete,
    };

    if (!isVercelBot) {
      console.log(`✅ [SESSION API] Clerk user authenticated:`, {
        email,
        tenantId: tenantId || 'none',
        onboardingComplete,
      });
    }

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ [SESSION API] Error:', error);
    
    return NextResponse.json({
      authenticated: false,
      user: null,
      tenant: null,
      onboardingComplete: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
