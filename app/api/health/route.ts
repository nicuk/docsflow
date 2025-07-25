import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// CORS headers for frontend integration
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
    ? 'https://docsflow.app,https://*.docsflow.app' 
    : '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-ID, X-Requested-With',
  'Access-Control-Allow-Credentials': 'true',
};

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET(request: NextRequest) {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    services: {
      supabase: 'unknown',
      google_ai: 'unknown',
    },
    environment_vars: {
      supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabase_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      google_ai_key: !!process.env.GOOGLE_AI_API_KEY,
    }
  };

  // Check Supabase connection
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      const { data, error } = await supabase.from('documents').select('count').limit(1);
      health.services.supabase = error ? 'error' : 'ok';
    } else {
      health.services.supabase = 'not_configured';
    }
  } catch (error) {
    health.services.supabase = 'error';
  }

  // Check Google AI
  try {
    health.services.google_ai = process.env.GOOGLE_AI_API_KEY ? 'configured' : 'not_configured';
  } catch (error) {
    health.services.google_ai = 'error';
  }

  const hasErrors = Object.values(health.services).some(status => status === 'error');
  const statusCode = hasErrors ? 503 : 200;

  return NextResponse.json(health, { 
    status: statusCode,
    headers: corsHeaders
  });
} 