import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

function getSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration not available');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

interface DeepSearchResult {
  chunks: any[];
  synthesisMap: Map<string, any[]>;
  crossReferences: any[];
  confidence: number;
}

export async function performDeepSearch(
  query: string,
  tenantId: string,
  userAccessLevel: number,
  genAI: GoogleGenerativeAI
): Promise<DeepSearchResult> {
  const supabase = getSupabaseClient();
  
  // Step 1: Generate query embedding
  const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const embeddingResult = await embeddingModel.embedContent(query);
  const queryEmbedding = embeddingResult.embedding.values;
  
  // Step 2: Multi-pass search with different thresholds
  const [highPrecision, mediumPrecision, broadSearch] = await Promise.all([
    // Pass 1: High precision (0.9 threshold)
    supabase.rpc('similarity_search_v2', {
      query_embedding: queryEmbedding,
      match_threshold: 0.9,
      match_count: 5,
      tenant_filter: tenantId,
      access_level_filter: userAccessLevel
    }),
    
    // Pass 2: Medium precision (0.85 threshold)
    supabase.rpc('similarity_search_v2', {
      query_embedding: queryEmbedding,
      match_threshold: 0.85,
      match_count: 10,
      tenant_filter: tenantId,
      access_level_filter: userAccessLevel
    }),
    
    // Pass 3: Broad search (0.75 threshold) for context
    supabase.rpc('similarity_search_v2', {
      query_embedding: queryEmbedding,
      match_threshold: 0.75,
      match_count: 20,
      tenant_filter: tenantId,
      access_level_filter: userAccessLevel
    })
  ]);
  
  // Step 3: Combine and deduplicate results
  const allChunks = new Map();
  
  // Prioritize high precision results
  highPrecision.data?.forEach((chunk: any) => {
    chunk.precision = 'high';
    allChunks.set(chunk.id, chunk);
  });
  
  // Add medium precision if not already included
  mediumPrecision.data?.forEach((chunk: any) => {
    if (!allChunks.has(chunk.id)) {
      chunk.precision = 'medium';
      allChunks.set(chunk.id, chunk);
    }
  });
  
  // Add broad search for context
  broadSearch.data?.forEach((chunk: any) => {
    if (!allChunks.has(chunk.id)) {
      chunk.precision = 'context';
      allChunks.set(chunk.id, chunk);
    }
  });
  
  const combinedChunks = Array.from(allChunks.values());
  
  // Step 4: Cross-document synthesis mapping
  const synthesisMap = new Map<string, any[]>();
  const documentGroups = new Map<string, any[]>();
  
  combinedChunks.forEach(chunk => {
    const docId = chunk.document_id;
    if (!documentGroups.has(docId)) {
      documentGroups.set(docId, []);
    }
    documentGroups.get(docId)!.push(chunk);
  });
  
  // Step 5: Find cross-references between documents
  const crossReferences: any[] = [];
  const docIds = Array.from(documentGroups.keys());
  
  for (let i = 0; i < docIds.length; i++) {
    for (let j = i + 1; j < docIds.length; j++) {
      const doc1Chunks = documentGroups.get(docIds[i])!;
      const doc2Chunks = documentGroups.get(docIds[j])!;
      
      // Find semantic relationships between documents
      const relationship = await findDocumentRelationship(
        doc1Chunks, doc2Chunks, query, genAI
      );
      
      if (relationship.strength > 0.7) {
        crossReferences.push({
          doc1: docIds[i],
          doc2: docIds[j],
          relationship: relationship.type,
          strength: relationship.strength,
          evidence: relationship.evidence
        });
      }
    }
  }
  
  // Step 6: Calculate overall confidence
  const avgSimilarity = combinedChunks.reduce((sum, chunk) => sum + chunk.similarity, 0) / combinedChunks.length;
  const precisionBonus = highPrecision.data?.length > 0 ? 0.1 : 0;
  const synthesisBonus = crossReferences.length > 0 ? 0.15 : 0;
  
  const confidence = Math.min(0.99, avgSimilarity + precisionBonus + synthesisBonus);
  
  return {
    chunks: combinedChunks,
    synthesisMap,
    crossReferences,
    confidence
  };
}

async function findDocumentRelationship(
  doc1Chunks: any[],
  doc2Chunks: any[],
  query: string,
  genAI: GoogleGenerativeAI
): Promise<{ type: string; strength: number; evidence: string[] }> {
  
  // Extract key concepts from both documents
  const doc1Content = doc1Chunks.map(c => c.content).join(' ').substring(0, 1000);
  const doc2Content = doc2Chunks.map(c => c.content).join(' ').substring(0, 1000);
  
  // Use LLM to identify relationships
  const analysisModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const relationshipPrompt = `
Analyze the relationship between these two document excerpts in the context of the query: "${query}"

Document 1: ${doc1Content}

Document 2: ${doc2Content}

Identify if there are:
1. Complementary information (one document provides context for the other)
2. Contradictory information (documents disagree on facts)
3. Sequential information (documents describe steps in a process)
4. Hierarchical information (one document provides overview, other provides details)

Return only: RELATIONSHIP_TYPE|STRENGTH_0_TO_1|EVIDENCE_PHRASE

Examples:
COMPLEMENTARY|0.8|Both discuss torque specifications for the same model
SEQUENTIAL|0.9|Document 1 describes preparation, Document 2 describes execution
NONE|0.2|Documents discuss unrelated topics
`;

  try {
    const result = await analysisModel.generateContent(relationshipPrompt);
    const response = result.response.text().trim();
    const [type, strengthStr, evidence] = response.split('|');
    
    return {
      type: type || 'NONE',
      strength: parseFloat(strengthStr) || 0,
      evidence: [evidence || 'No clear relationship found']
    };
  } catch (error) {
    console.error('Relationship analysis error:', error);
    return { type: 'NONE', strength: 0, evidence: [] };
  }
}

export function buildSynthesizedContext(searchResult: DeepSearchResult): string {
  const { chunks, crossReferences } = searchResult;
  
  // Group chunks by precision level
  const highPrecision = chunks.filter(c => c.precision === 'high');
  const mediumPrecision = chunks.filter(c => c.precision === 'medium');
  const contextChunks = chunks.filter(c => c.precision === 'context');
  
  let synthesizedContext = '';
  
  // Start with high precision information
  if (highPrecision.length > 0) {
    synthesizedContext += '🎯 PRIMARY SOURCES (High Relevance):\n';
    highPrecision.forEach((chunk, idx) => {
      synthesizedContext += `${idx + 1}. Source: ${chunk.source || 'Unknown'}\n`;
      synthesizedContext += `   Content: ${chunk.content}\n`;
      synthesizedContext += `   Confidence: ${(chunk.similarity * 100).toFixed(1)}%\n\n`;
    });
  }
  
  // Add medium precision for additional context
  if (mediumPrecision.length > 0) {
    synthesizedContext += '📋 SUPPORTING SOURCES (Medium Relevance):\n';
    mediumPrecision.forEach((chunk, idx) => {
      synthesizedContext += `${idx + 1}. Source: ${chunk.source || 'Unknown'}\n`;
      synthesizedContext += `   Content: ${chunk.content}\n\n`;
    });
  }
  
  // Add cross-references if found
  if (crossReferences.length > 0) {
    synthesizedContext += '🔗 CROSS-DOCUMENT RELATIONSHIPS:\n';
    crossReferences.forEach((ref, idx) => {
      synthesizedContext += `${idx + 1}. ${ref.relationship} relationship between documents (${(ref.strength * 100).toFixed(1)}% confidence)\n`;
      synthesizedContext += `   Evidence: ${ref.evidence.join(', ')}\n\n`;
    });
  }
  
  return synthesizedContext;
} 