/**
 * Source Deduplicator
 * 
 * Groups sources by document to avoid showing the same document
 * multiple times in the sources list
 */

export interface Source {
  document: string;
  documentId?: string;
  page: number;
  snippet: string;
  confidence: number;
  content?: string;
  filename?: string;
  source?: string;
  metadata?: any;
}

export interface GroupedSource {
  document: string;
  documentId?: string;
  chunkCount: number;
  maxConfidence: number;
  avgConfidence: number;
  pages: number[];
  chunks: Array<{
    page: number;
    snippet: string;
    confidence: number;
  }>;
}

/**
 * Deduplicate sources by grouping chunks from the same document
 */
export function deduplicateSources(sources: Source[]): GroupedSource[] {
  if (!sources || sources.length === 0) {
    return [];
  }
  
  // Group by document name
  const grouped = new Map<string, {
    documentId?: string;
    chunks: Array<{ page: number; snippet: string; confidence: number }>;
    confidences: number[];
  }>();
  
  sources.forEach(source => {
    const docName = source.document || source.filename || source.source || 'Unknown Document';
    
    if (!grouped.has(docName)) {
      grouped.set(docName, {
        documentId: source.documentId,
        chunks: [],
        confidences: [],
      });
    }
    
    const group = grouped.get(docName)!;
    group.chunks.push({
      page: source.page || 1,
      snippet: source.snippet || source.content?.substring(0, 200) + '...' || '',
      confidence: source.confidence || 0,
    });
    group.confidences.push(source.confidence || 0);
  });
  
  // Convert to array and calculate stats
  return Array.from(grouped.entries()).map(([document, data]) => {
    const maxConfidence = Math.max(...data.confidences);
    const avgConfidence = data.confidences.reduce((a, b) => a + b, 0) / data.confidences.length;
    const pages = [...new Set(data.chunks.map(c => c.page))].sort((a, b) => a - b);
    
    return {
      document,
      documentId: data.documentId,
      chunkCount: data.chunks.length,
      maxConfidence,
      avgConfidence,
      pages,
      chunks: data.chunks.sort((a, b) => b.confidence - a.confidence), // Sort by confidence
    };
  }).sort((a, b) => b.maxConfidence - a.maxConfidence); // Sort by best confidence
}

/**
 * Format grouped sources for display
 */
export function formatGroupedSource(grouped: GroupedSource): string {
  const pageInfo = grouped.pages.length === 1 
    ? `page ${grouped.pages[0]}` 
    : `pages ${grouped.pages.join(', ')}`;
  
  const chunkInfo = grouped.chunkCount > 1 
    ? ` (${grouped.chunkCount} relevant sections)` 
    : '';
  
  return `${grouped.document} (${pageInfo})${chunkInfo}`;
}

/**
 * Get the best chunk from a grouped source
 */
export function getBestChunk(grouped: GroupedSource): { page: number; snippet: string; confidence: number } {
  return grouped.chunks[0]; // Already sorted by confidence
}

