import { NextRequest, NextResponse } from 'next/server';
import { getSubdomainData } from '@/lib/subdomains';
import { getSupabaseClient } from '@/lib/supabase';

const supabase = getSupabaseClient();

// Generate intelligent subdomain suggestions
function generateSubdomainSuggestions(requestedSubdomain: string): string[] {
  const suggestions = [];
  const base = requestedSubdomain.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Add common business suffixes
  suggestions.push(`${base}-corp`, `${base}-inc`, `${base}-llc`, `${base}-co`);
  
  // Add year
  const currentYear = new Date().getFullYear();
  suggestions.push(`${base}${currentYear}`, `${base}-${currentYear}`);
  
  // Add location-based
  suggestions.push(`${base}-usa`, `${base}-hq`, `${base}-main`);
  
  // Add numbers
  for (let i = 1; i <= 3; i++) {
    suggestions.push(`${base}${i}`, `${base}-${i}`);
  }
  
  // Add descriptive suffixes
  suggestions.push(`${base}-team`, `${base}-group`, `${base}-pro`);
  
  // Remove duplicates and filter out invalid/long names
  return [...new Set(suggestions)]
    .filter(s => s.length >= 3 && s.length <= 20)
    .slice(0, 6);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subdomain = searchParams.get('subdomain');

    if (!subdomain) {
      return NextResponse.json(
        { error: 'Subdomain parameter is required' },
        { status: 400 }
      );
    }

    // Sanitize subdomain
    const sanitizedSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');

    if (sanitizedSubdomain !== subdomain) {
      return NextResponse.json({
        available: false,
        error: 'Subdomain can only contain lowercase letters, numbers, and hyphens'
      });
    }

    if (sanitizedSubdomain.length < 3 || sanitizedSubdomain.length > 63) {
      return NextResponse.json({
        available: false,
        error: 'Subdomain must be between 3 and 63 characters'
      });
    }

    // Reserved subdomains
    const reservedSubdomains = [
      'www', 'api', 'admin', 'app', 'mail', 'ftp', 'blog', 'shop', 'store',
      'support', 'help', 'docs', 'cdn', 'static', 'assets', 'test', 'staging',
      'dev', 'demo', 'beta', 'alpha', 'preview', 'dashboard', 'console'
    ];

    if (reservedSubdomains.includes(sanitizedSubdomain)) {
      return NextResponse.json({
        available: false,
        error: 'This subdomain is reserved'
      });
    }

    // Check if subdomain exists in Redis (legacy)
    const existingData = await getSubdomainData(sanitizedSubdomain);
    
    // Also check Supabase (new system)
    const { data: supabaseTenant, error: supabaseError } = await supabase!
      .from('tenants')
      .select('id, subdomain, name, industry, created_at')
      .eq('subdomain', sanitizedSubdomain)
      .maybeSingle(); // Use maybeSingle() to avoid error when no rows found

    if (existingData || supabaseTenant) {
      const suggestions = generateSubdomainSuggestions(sanitizedSubdomain);
      const tenant = supabaseTenant || {
        name: existingData?.displayName || 'Unknown Organization',
        industry: 'general', // Default since frontend SubdomainData doesn't include industry
        created_at: existingData?.createdAt ? new Date(existingData.createdAt).toISOString() : null
      };
      
      return NextResponse.json({
        available: false,
        error: 'Subdomain is already taken',
        existingTenant: {
          id: sanitizedSubdomain,
          name: tenant.name,
          industry: supabaseTenant?.industry || 'general',
          createdAt: tenant.created_at
        },
        suggestions
      });
    }

    // Subdomain is available
    return NextResponse.json({
      available: true,
      message: 'Subdomain is available'
    });

  } catch (error) {
    console.error('Subdomain check error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const subdomain = body.subdomain;

    if (!subdomain) {
      return NextResponse.json(
        { error: 'Subdomain parameter is required' },
        { status: 400 }
      );
    }

    // Sanitize subdomain
    const sanitizedSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');

    if (sanitizedSubdomain !== subdomain) {
      return NextResponse.json({
        available: false,
        error: 'Subdomain can only contain lowercase letters, numbers, and hyphens'
      });
    }

    if (sanitizedSubdomain.length < 3 || sanitizedSubdomain.length > 63) {
      return NextResponse.json({
        available: false,
        error: 'Subdomain must be between 3 and 63 characters'
      });
    }

    // Reserved subdomains
    const reservedSubdomains = [
      'www', 'api', 'admin', 'app', 'mail', 'ftp', 'blog', 'shop', 'store',
      'support', 'help', 'docs', 'cdn', 'static', 'assets', 'test', 'staging',
      'dev', 'demo', 'beta', 'alpha', 'preview', 'dashboard', 'console'
    ];

    if (reservedSubdomains.includes(sanitizedSubdomain)) {
      return NextResponse.json({
        available: false,
        error: 'This subdomain is reserved'
      });
    }

    // Check if subdomain exists in Redis (legacy)
    const existingData = await getSubdomainData(sanitizedSubdomain);
    
    // Also check Supabase (new system)
    const { data: supabaseTenant, error: supabaseError } = await supabase!
      .from('tenants')
      .select('id, subdomain, name, industry, created_at')
      .eq('subdomain', sanitizedSubdomain)
      .maybeSingle(); // Use maybeSingle() to avoid error when no rows found

    if (existingData || supabaseTenant) {
      const suggestions = generateSubdomainSuggestions(sanitizedSubdomain);
      const tenant = supabaseTenant || {
        name: existingData?.displayName || 'Unknown Organization',
        industry: 'general', // Default since frontend SubdomainData doesn't include industry
        created_at: existingData?.createdAt ? new Date(existingData.createdAt).toISOString() : null
      };
      
      return NextResponse.json({
        available: false,
        error: 'Subdomain is already taken',
        existingTenant: {
          id: sanitizedSubdomain,
          name: tenant.name,
          industry: tenant.industry,
          userCount: 1,
          created_at: tenant.created_at
        },
        suggestions
      });
    }

    return NextResponse.json({
      available: true,
      subdomain: sanitizedSubdomain
    });

  } catch (error) {
    console.error('Error checking subdomain availability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}