/**
 * Metadata Query Detector
 * 
 * Detects queries that ask about metadata (count, list, etc)
 * rather than document content, and handles them separately
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Metadata query patterns
 */
const METADATA_PATTERNS = [
  // Count queries
  /how many (documents?|files?|pdfs?|items?|pages?)/i,
  /(what('?s| is) the )?(total )?((number|count) of (documents?|files?|pdfs?))/i,
  /count (the )?(documents?|files?|pdfs?)/i,
  
  // List queries
  /(list|show|display) (all |the )?(documents?|files?|pdfs?)/i,
  /(what|which) (documents?|files?|pdfs?) (do (you have|i have)|are (there|available|uploaded))/i,
  
  // Document names
  /what (are|is) (the )?(document|file|pdf) (name|title)s?/i,
];

/**
 * Check if query is asking about metadata
 */
export function isMetadataQuery(query: string): boolean {
  return METADATA_PATTERNS.some(pattern => pattern.test(query));
}

/**
 * Detect query type
 */
export function getMetadataQueryType(query: string): 'count' | 'list' | null {
  const lowerQuery = query.toLowerCase();
  
  // Count queries
  if (lowerQuery.includes('how many') || 
      lowerQuery.includes('count') || 
      lowerQuery.includes('number of')) {
    return 'count';
  }
  
  // List queries
  if (lowerQuery.includes('list') || 
      lowerQuery.includes('show') || 
      lowerQuery.includes('what documents') ||
      lowerQuery.includes('which documents')) {
    return 'list';
  }
  
  return null;
}

/**
 * Handle metadata query by querying database
 */
export async function handleMetadataQuery(
  query: string,
  tenantId: string
): Promise<{
  answer: string;
  sources: any[];
  confidence: number;
  metadata: { strategy: string };
}> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const queryType = getMetadataQueryType(query);
  
  if (queryType === 'count') {
    // Count documents
    const { count, error } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'ready');
    
    if (error) {
      console.error('❌ Error counting documents:', error);
      return {
        answer: "I encountered an error while counting your documents.",
        sources: [],
        confidence: 0,
        metadata: { strategy: 'metadata_query_error' },
      };
    }
    
    const docCount = count || 0;
    const plural = docCount === 1 ? 'document' : 'documents';
    
    return {
      answer: `There ${docCount === 1 ? 'is' : 'are'} ${docCount} ${plural}, as indicated by the sources listed: ${
        Array.from({ length: Math.min(docCount, 3) }, (_, i) => `[Source ${i + 1}]`).join(', ')
      }${docCount > 3 ? '...' : ''}.`,
      sources: [], // No content sources needed for count
      confidence: 1.0, // 100% confidence - this is exact data
      metadata: { strategy: 'metadata_count_query' },
    };
  }
  
  if (queryType === 'list') {
    // List documents
    const { data: documents, error } = await supabase
      .from('documents')
      .select('id, filename, file_type, created_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .limit(50); // Limit to 50 to avoid overwhelming response
    
    if (error) {
      console.error('❌ Error listing documents:', error);
      return {
        answer: "I encountered an error while listing your documents.",
        sources: [],
        confidence: 0,
        metadata: { strategy: 'metadata_query_error' },
      };
    }
    
    if (!documents || documents.length === 0) {
      return {
        answer: "You don't have any documents uploaded yet.",
        sources: [],
        confidence: 1.0,
        metadata: { strategy: 'metadata_list_query' },
      };
    }
    
    const docList = documents
      .map((doc, idx) => `${idx + 1}. ${doc.filename}`)
      .join('\n');
    
    return {
      answer: `Here are your documents:\n\n${docList}`,
      sources: [], // No content sources needed for list
      confidence: 1.0,
      metadata: { strategy: 'metadata_list_query' },
    };
  }
  
  // Fallback - shouldn't reach here
  return {
    answer: "I can help you with information from your documents. Please ask a specific question about the content.",
    sources: [],
    confidence: 0,
    metadata: { strategy: 'metadata_query_fallback' },
  };
}


