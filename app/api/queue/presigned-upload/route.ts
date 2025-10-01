/**
 * Presigned Upload API Route
 * 
 * Generates presigned URLs for direct file uploads to Supabase Storage.
 * This bypasses the API for actual file transfer, avoiding timeout issues.
 * 
 * Flow:
 * 1. Client requests presigned URL
 * 2. Server generates URL with temporary token
 * 3. Client uploads file directly to storage
 * 4. Client calls /api/queue/enqueue to create processing job
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateAuth } from '@/lib/auth-helpers';
import type { PresignedUploadRequest, PresignedUploadResponse } from '@/lib/queue';
import { DEFAULT_UPLOAD_CONFIG, isAllowedFileType, isValidFileSize } from '@/lib/queue';

// =====================================================
// CONFIGURATION
// =====================================================

const STORAGE_BUCKET = 'documents'; // Supabase Storage bucket name
const URL_EXPIRY_SECONDS = 300; // 5 minutes to upload

// =====================================================
// POST /api/queue/presigned-upload
// =====================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user and get tenant
    const { tenantId, userId } = await validateAuth(request);
    
    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 2. Parse and validate request
    const body = await request.json() as PresignedUploadRequest;
    const { filename, file_type, file_size } = body;
    
    if (!filename || !file_type || !file_size) {
      return NextResponse.json(
        { error: 'Missing required fields: filename, file_type, file_size' },
        { status: 400 }
      );
    }
    
    // 3. Validate file type
    if (!isAllowedFileType(file_type, DEFAULT_UPLOAD_CONFIG.allowed_file_types)) {
      return NextResponse.json(
        { 
          error: 'Invalid file type',
          allowed_types: DEFAULT_UPLOAD_CONFIG.allowed_file_types
        },
        { status: 400 }
      );
    }
    
    // 4. Validate file size
    if (!isValidFileSize(file_size, DEFAULT_UPLOAD_CONFIG.max_file_size)) {
      return NextResponse.json(
        { 
          error: 'File size exceeds limit',
          max_size: DEFAULT_UPLOAD_CONFIG.max_file_size
        },
        { status: 400 }
      );
    }
    
    // 5. Create Supabase client with service role (bypass RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );
    
    // 6. Generate unique file path
    // Format: {tenant_id}/{timestamp}_{sanitized_filename}
    const timestamp = Date.now();
    const sanitizedFilename = filename
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Remove special chars
      .substring(0, 200); // Limit length
    
    const filePath = `${tenantId}/${timestamp}_${sanitizedFilename}`;
    
    // 7. Generate presigned upload URL
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUploadUrl(filePath, {
        upsert: false // Don't allow overwriting
      });
    
    if (error) {
      console.error('Error creating presigned URL:', error);
      return NextResponse.json(
        { error: 'Failed to generate upload URL', details: error.message },
        { status: 500 }
      );
    }
    
    // 8. Return presigned URL and metadata
    const response: PresignedUploadResponse = {
      upload_url: data.signedUrl,
      file_path: data.path,
      token: data.token
    };
    
    console.log(`✅ Generated presigned URL for ${filename} (tenant: ${tenantId})`);
    
    return NextResponse.json(response, { status: 200 });
    
  } catch (error) {
    console.error('Error in presigned-upload route:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// =====================================================
// CORS HEADERS (if needed for client uploads)
// =====================================================

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

