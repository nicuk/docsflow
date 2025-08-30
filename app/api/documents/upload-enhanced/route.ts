/**
 * Enhanced Document Upload API with Multimodal Parsing
 * This is an example integration showing how to use the new multimodal parser
 * with proper feature flags and monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MultimodalDocumentParser } from '@/lib/rag-multimodal-parser';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { trackParseOperation, trackTenantViolation } from '@/lib/rag-monitoring';
import { validateTenantContext } from '@/lib/api-tenant-validation';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Validate tenant context
    const validation = await validateTenantContext(request);
    if (!validation.isValid || !validation.tenantId) {
      return NextResponse.json(
        { error: 'Invalid tenant context' },
        { status: 401 }
      );
    }
    
    const { tenantId } = validation;
    
    // Parse request
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Set tenant context for RLS
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });
    
    let parsedDocument;
    let parseMethod: 'advanced' | 'basic' = 'basic';
    
    // Check if multimodal parsing is enabled for this tenant
    if (isFeatureEnabled('MULTIMODAL_PARSING', tenantId)) {
      console.log(`[Documents Upload] Using multimodal parser for tenant ${tenantId}`);
      
      try {
        const parser = new MultimodalDocumentParser(tenantId);
        parsedDocument = await parser.parseDocument(
          buffer,
          file.type,
          file.name
        );
        parseMethod = parsedDocument.metadata.parse_method as 'advanced' | 'basic';
        
        // Generate embeddings for chunks if advanced parsing succeeded
        if (parseMethod === 'advanced') {
          parsedDocument = await parser.generateEmbeddings(parsedDocument.chunks);
        }
      } catch (error) {
        console.error('[Documents Upload] Multimodal parsing failed, using fallback:', error);
        // Fallback to basic parsing
        parsedDocument = {
          text: buffer.toString('utf-8').substring(0, 100000),
          metadata: {
            tenant_id: tenantId,
            mime_type: file.type,
            parse_method: 'basic'
          },
          chunks: []
        };
      }
    } else {
      // Use basic parsing for tenants without the feature
      console.log(`[Documents Upload] Using basic parser for tenant ${tenantId}`);
      parsedDocument = {
        text: buffer.toString('utf-8').substring(0, 100000),
        metadata: {
          tenant_id: tenantId,
          mime_type: file.type,
          parse_method: 'basic'
        },
        chunks: []
      };
    }
    
    // Verify tenant isolation - CRITICAL CHECK
    if (parsedDocument.metadata.tenant_id !== tenantId) {
      trackTenantViolation(
        tenantId,
        parsedDocument.metadata.tenant_id,
        'Document parser returned different tenant ID'
      );
      return NextResponse.json(
        { error: 'Tenant isolation violation detected' },
        { status: 500 }
      );
    }
    
    // Store document in database
    const { data: document, error: insertError } = await supabase
      .from('documents')
      .insert({
        tenant_id: tenantId,
        name: file.name,
        content: parsedDocument.text,
        mime_type: file.type,
        size: buffer.length,
        metadata: parsedDocument.metadata,
        parse_method: parseMethod,
        has_tables: (parsedDocument.metadata.tables?.length || 0) > 0,
        has_images: (parsedDocument.metadata.images?.length || 0) > 0,
        chunk_count: parsedDocument.chunks.length
      })
      .select()
      .single();
    
    if (insertError) {
      throw insertError;
    }
    
    // Store chunks if available
    if (parsedDocument.chunks.length > 0) {
      const chunks = parsedDocument.chunks.map((chunk, index) => ({
        document_id: document.id,
        tenant_id: tenantId,
        content: chunk.content,
        type: chunk.type,
        position: index,
        metadata: chunk.metadata,
        embedding: chunk.embedding
      }));
      
      const { error: chunkError } = await supabase
        .from('document_chunks')
        .insert(chunks);
      
      if (chunkError) {
        console.error('[Documents Upload] Failed to store chunks:', chunkError);
      }
    }
    
    // Track metrics
    const duration = Date.now() - startTime;
    trackParseOperation(
      tenantId,
      duration,
      true,
      parseMethod,
      file.type
    );
    
    // Return success response
    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        name: document.name,
        size: document.size,
        parseMethod,
        chunkCount: parsedDocument.chunks.length,
        hasTables: document.has_tables,
        hasImages: document.has_images
      },
      metrics: {
        parseTime: duration,
        method: parseMethod
      }
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Track error
    const tenantId = request.headers.get('x-tenant-id') || 'unknown';
    trackParseOperation(
      tenantId,
      duration,
      false,
      'basic',
      'unknown'
    );
    
    console.error('[Documents Upload] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to upload document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://docsflow.app',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-tenant-id, x-tenant-subdomain',
    },
  });
}
