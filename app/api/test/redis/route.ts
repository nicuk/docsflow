import { NextRequest, NextResponse } from 'next/server';
import { redis, safeRedisOperation } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    const testKey = 'redis-test-key';
    const testValue = { 
      timestamp: Date.now(), 
      message: 'Redis integration test',
      environment: process.env.NODE_ENV 
    };

    // Test Redis write
    const writeResult = await safeRedisOperation(
      () => redis!.setex(testKey, 60, JSON.stringify(testValue)), // 60 seconds TTL
      null
    );

    // Test Redis read
    const readResult = await safeRedisOperation(
      () => redis!.get(testKey),
      null
    );

    // Clean up test key
    await safeRedisOperation(
      () => redis!.del(testKey),
      null
    );

    return NextResponse.json({
      success: true,
      redis_available: !!redis,
      environment_vars: {
        has_url: !!process.env.KV_REST_API_URL,
        has_token: !!process.env.KV_REST_API_TOKEN,
        node_env: process.env.NODE_ENV
      },
      test_results: {
        write_success: writeResult !== null,
        read_success: readResult !== null,
        data_matches: readResult ? JSON.parse(readResult as string).message === testValue.message : false
      }
    });

  } catch (error) {
    console.error('Redis test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      redis_available: !!redis,
      environment_vars: {
        has_url: !!process.env.KV_REST_API_URL,
        has_token: !!process.env.KV_REST_API_TOKEN,
        node_env: process.env.NODE_ENV
      }
    }, { status: 500 });
  }
}
