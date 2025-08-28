import { NextRequest, NextResponse } from 'next/server';
import { redis, safeRedisOperation } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    // Get all tenant keys from Redis (match middleware cache pattern)
    const tenantKeys = await safeRedisOperation(
      () => redis!.keys('tenant:subdomain:*'),
      []
    );

    const tenantData = [];
    
    for (const key of tenantKeys) {
      const data = await safeRedisOperation(
        () => redis!.get(key),
        null
      );
      
      if (data) {
        try {
          const parsedData = JSON.parse(data as string);
          tenantData.push({
            key,
            subdomain: key.replace('tenant:subdomain:', ''),
            data: parsedData
          });
        } catch (parseError) {
          // If JSON parsing fails, store raw data
          tenantData.push({
            key,
            subdomain: key.replace('tenant:subdomain:', ''),
            data: data,
            parse_error: 'Invalid JSON stored in cache'
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      total_tenants: tenantData.length,
      tenants: tenantData,
      raw_keys: tenantKeys
    });

  } catch (error) {
    console.error('Redis cache check error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// DELETE endpoint to clear specific tenant from cache
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subdomain = searchParams.get('subdomain');
    
    if (!subdomain) {
      return NextResponse.json({
        error: 'Subdomain parameter required'
      }, { status: 400 });
    }

    const key = `tenant:subdomain:${subdomain}`;
    const deleted = await safeRedisOperation(
      () => redis!.del(key),
      0
    );

    return NextResponse.json({
      success: true,
      deleted: deleted > 0,
      key_removed: key
    });

  } catch (error) {
    console.error('Redis cache delete error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
