import { NextRequest } from 'next/server';
import { createResponseWithSessionCookies, createCORSResponse } from '@/lib/cookie-utils';

/**
 * Test endpoint to verify cookie/session implementation
 * GET /api/test/cookies - Test cookie setting and reading
 */
export async function GET(request: NextRequest) {
  try {
    // Test setting session cookies
    const response = createResponseWithSessionCookies({
      success: true,
      message: 'Cookie test successful',
      timestamp: new Date().toISOString(),
      cookies_set: {
        'user-email': 'test@example.com',
        'user-name': 'Test User',
        'tenant-id': 'test-tenant',
        'onboarding-complete': 'true'
      }
    }, {
      userEmail: 'test@example.com',
      userName: 'Test User', 
      tenantId: 'test-tenant',
      onboardingComplete: true
    });

    return response;

  } catch (error) {
    console.error('Cookie test error:', error);
    
    return createCORSResponse({
      success: false,
      error: 'Cookie test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS(request: NextRequest) {
  return createCORSResponse({}, 200);
}
