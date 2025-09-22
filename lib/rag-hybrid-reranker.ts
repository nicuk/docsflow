import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenRouterClient, MODEL_CONFIGS } from '@/lib/openrouter-client';

interface SearchResult {
  id: string;
  content: string;
  metadata: any;
  vectorScore: number;
  keywordScore: number;
  hybridScore?: number;
  rerankedScore?: number;
  provenance: {
    source: string;
    page?: number;
    section?: string;
    confidence: number;
  };
}

interface RewrittenQuery {
  original: string;
  rewritten: string[];
  decomposed: string[];
  expansions: string[];
  strategy: 'simple' | 'complex' | 'multi-hop';
}

export class HybridRAGReranker {
  private supabase: any;
  private genAI: GoogleGenerativeAI;
  private crossEncoder: any;
  private openRouterClient: OpenRouterClient;
  private tenantId: string; // 🎯 SURGICAL FIX: Store tenant context

  constructor(tenantId: string) { // 🎯 SURGICAL FIX: Accept tenant ID
    this.tenantId = tenantId;
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
    this.crossEncoder = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      systemInstruction: `You are a cross-encoder reranking expert. Score relevance from 0-1.
Consider: exact match, semantic similarity, temporal relevance, entity alignment, and answer completeness.`
    });
    
    this.openRouterClient = new OpenRouterClient();
  }

  /**
   * Advanced query rewriting with multiple strategies
   */
  async rewriteQuery(query: string): Promise<RewrittenQuery> {
    const prompt = `
Rewrite and decompose this query for optimal RAG retrieval:

Original Query: "${query}"

Provide:
1. Simplified rewrites (2-3 variations)
2. Decomposed sub-queries (if complex)
3. Expanded queries with synonyms/related terms
4. Strategy classification

Format as JSON:
{
  "rewritten": ["rewrite1", "rewrite2"],
  "decomposed": ["subquery1", "subquery2"],
  "expansions": ["expanded1", "expanded2"],
  "strategy": "simple|complex|multi-hop"
}`;

    try {
      const result = await this.crossEncoder.generateContent(prompt);
      const response = result.response.text()
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '');
      
      const parsed = JSON.parse(response);
      
      return {
        original: query,
        rewritten: parsed.rewritten || [query],
        decomposed: parsed.decomposed || [],
        expansions: parsed.expansions || [],
        strategy: parsed.strategy || 'simple'
      };
    } catch (error) {
      console.error('Query rewrite failed:', error);
      return {
        original: query,
        rewritten: [query],
        decomposed: [],
        expansions: [],
        strategy: 'simple'
      };
    }
  }

  /**
   * Hybrid search combining vector and keyword search
   */
  async hybridSearch(
    query: string,
    tenantId: string,
    topK: number = 20
  ): Promise<SearchResult[]> {
    const rewrittenQuery = await this.rewriteQuery(query);
    
    // Perform multiple searches in parallel
    const searchPromises = [];
    
    // Vector search for original and rewrites
    for (const q of [rewrittenQuery.original, ...rewrittenQuery.rewritten]) {
      searchPromises.push(this.performVectorSearch(q, tenantId, topK));
    }
    
    // Keyword search for all variations
    for (const q of [...rewrittenQuery.rewritten, ...rewrittenQuery.expansions]) {
      searchPromises.push(this.performKeywordSearch(q, tenantId, topK));
    }
    
    const allResults = await Promise.all(searchPromises);
    
    // Merge and deduplicate results
    const mergedResults = this.mergeSearchResults(allResults.flat());
    
    // Apply hybrid scoring (RRF - Reciprocal Rank Fusion)
    return this.applyHybridScoring(mergedResults);
  }

  /**
   * Cross-encoder reranking for final relevance scoring
   */
  async crossEncoderRerank(
    query: string,
    results: SearchResult[],
    topK: number = 10
  ): Promise<SearchResult[]> {
    const rerankedResults = await Promise.all(
      results.map(async (result) => {
        const prompt = `
Score the relevance of this document to the query (0-1):

Query: "${query}"

Document:
${result.content.substring(0, 1000)}

Consider:
1. Direct answer presence
2. Semantic relevance
3. Information completeness
4. Factual accuracy

Return only a number between 0 and 1.`;

        try {
          const response = await this.crossEncoder.generateContent(prompt);
          const score = parseFloat(response.response.text().trim());
          
          return {
            ...result,
            rerankedScore: isNaN(score) ? result.hybridScore || 0 : score
          };
        } catch (error) {
          console.error('Reranking failed for result:', error);
          return {
            ...result,
            rerankedScore: result.hybridScore || 0
          };
        }
      })
    );
    
    // Sort by reranked score and return top K
    return rerankedResults
      .sort((a, b) => (b.rerankedScore || 0) - (a.rerankedScore || 0))
      .slice(0, topK);
  }

  /**
   * Strict provenance tracking and abstention
   */
  async applyProvenanceAndAbstention(
    query: string,
    results: SearchResult[],
    confidenceThreshold: number = 0.7
  ): Promise<{
    results: SearchResult[];
    shouldAbstain: boolean;
    abstentionReason?: string;
    confidence: number;
  }> {
    // Check if we have sufficient evidence
    const highConfidenceResults = results.filter(
      r => (r.rerankedScore || r.hybridScore || 0) >= confidenceThreshold
    );
    
    if (highConfidenceResults.length === 0) {
      return {
        results: [],
        shouldAbstain: true,
        abstentionReason: 'No documents found with sufficient confidence',
        confidence: 0
      };
    }
    
    // Add strict provenance to each result
    const resultsWithProvenance = highConfidenceResults.map(result => ({
      ...result,
      provenance: {
        source: result.metadata?.filename || 'Unknown',
        page: result.metadata?.page,
        section: result.metadata?.section,
        confidence: result.rerankedScore || result.hybridScore || 0
      }
    }));
    
    // Calculate overall confidence
    const avgConfidence = resultsWithProvenance.reduce(
      (sum, r) => sum + r.provenance.confidence, 0
    ) / resultsWithProvenance.length;
    
    // Abstain if confidence is too low
    if (avgConfidence < confidenceThreshold) {
      return {
        results: resultsWithProvenance,
        shouldAbstain: true,
        abstentionReason: `Average confidence (${avgConfidence.toFixed(2)}) below threshold`,
        confidence: avgConfidence
      };
    }
    
    return {
      results: resultsWithProvenance,
      shouldAbstain: false,
      confidence: avgConfidence
    };
  }

  /**
   * Complete enhanced RAG pipeline
   */
  async enhancedRAGPipeline(
    query: string,
    tenantId: string,
    options: {
      topK?: number;
      confidenceThreshold?: number;
      includeProvenance?: boolean;
    } = {}
  ): Promise<any> {
    const {
      topK = 10,
      confidenceThreshold = 0.7,
      includeProvenance = true
    } = options;
    
    // Step 1: Hybrid search with query rewriting
    const hybridResults = await this.hybridSearch(query, tenantId, topK * 2);
    
    // Step 2: Cross-encoder reranking
    const rerankedResults = await this.crossEncoderRerank(query, hybridResults, topK);
    
    // Step 3: Apply provenance and abstention logic
    const { results, shouldAbstain, abstentionReason, confidence } = 
      await this.applyProvenanceAndAbstention(query, rerankedResults, confidenceThreshold);
    
    if (shouldAbstain) {
      return {
        success: false,
        abstained: true,
        reason: abstentionReason,
        confidence,
        message: "I don't have enough information to answer this question confidently.",
        suggestedAction: "Please provide more specific details or upload relevant documents."
      };
    }
    
    // Step 4: Generate response with citations
    const response = await this.generateCitedResponse(query, results);
    
    return {
      success: true,
      response,
      confidence,
      sources: includeProvenance ? results.map(r => r.provenance) : [],
      metadata: {
        totalDocumentsSearched: hybridResults.length,
        documentsUsed: results.length,
        averageRelevance: confidence,
        searchStrategy: 'hybrid_crossencoder_rerank'
      }
    };
  }

  private async performVectorSearch(
    query: string,
    tenantId: string,
    limit: number
  ): Promise<SearchResult[]> {
    console.log(`🔍 Vector search for tenant ${tenantId}, query: "${query}"`);
    
    const queryEmbedding = await this.getEmbedding(query);
    
    const { data, error } = await this.supabase
      .rpc('similarity_search', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: limit,
        tenant_id: tenantId
      });
    
    console.log(`📊 Search result count: ${data?.length || 0}`);
    if (error) {
      console.error(`❌ Vector search error:`, error);
    }
    
    if (error || !data) return [];
    
    return data.map((d: any) => ({
      id: d.id,
      content: d.content,
      metadata: d.metadata,
      vectorScore: d.similarity || 0,
      keywordScore: 0
    }));
  }

  private async performKeywordSearch(
    query: string,
    tenantId: string,
    limit: number
  ): Promise<SearchResult[]> {
    console.log(`🔍 [RAG SEARCH v3] SCHEMA FIX: Searching document_chunks for tenant ${tenantId}: "${query}"`);
    console.log(`🔧 [RAG SEARCH v3] Using stored tenant ID: ${this.tenantId}`);
    const { data, error } = await this.supabase
      .from('document_chunks') // 🎯 SCHEMA FIX: Search chunks not documents
      .select('id, document_id, content, metadata, tenant_id')
      .eq('tenant_id', this.tenantId) // 🎯 SURGICAL FIX: Use stored tenant ID
      .ilike('content', `%${query}%`)
      .limit(limit);
    
    console.log(`📊 [RAG SEARCH v3] CHUNK RESULTS: ${data?.length || 0} chunks found for tenant ${this.tenantId}`);
    
    if (error || !data) return [];
    
    return data.map((d: any) => ({
      id: d.document_id, // 🎯 SCHEMA FIX: Use document_id for chunk results
      content: d.content,
      metadata: d.metadata,
      vectorScore: 0,
      keywordScore: 1 // Simple binary score for keyword match
    }));
  }

  private async getEmbedding(text: string): Promise<number[]> {
    try {
      const result = await this.crossEncoder.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw error;
    }
  }

  private mergeSearchResults(results: SearchResult[]): SearchResult[] {
    const merged = new Map<string, SearchResult>();
    
    for (const result of results) {
      if (merged.has(result.id)) {
        const existing = merged.get(result.id)!;
        existing.vectorScore = Math.max(existing.vectorScore, result.vectorScore);
        existing.keywordScore = Math.max(existing.keywordScore, result.keywordScore);
      } else {
        merged.set(result.id, result);
      }
    }
    
    return Array.from(merged.values());
  }

  private applyHybridScoring(results: SearchResult[]): SearchResult[] {
    // Reciprocal Rank Fusion (RRF)
    const k = 60; // RRF constant
    
    return results.map(result => {
      const vectorRank = results
        .sort((a, b) => b.vectorScore - a.vectorScore)
        .findIndex(r => r.id === result.id) + 1;
      
      const keywordRank = results
        .sort((a, b) => b.keywordScore - a.keywordScore)
        .findIndex(r => r.id === result.id) + 1;
      
      const rrfScore = (1 / (k + vectorRank)) + (1 / (k + keywordRank));
      
      return {
        ...result,
        hybridScore: rrfScore
      };
    }).sort((a, b) => (b.hybridScore || 0) - (a.hybridScore || 0));
  }

  private async generateCitedResponse(query: string, results: SearchResult[]): Promise<string> {
    const context = results.map((r, i) => 
      `[${i + 1}] ${r.provenance.source}: ${r.content.substring(0, 500)}`
    ).join('\n\n');
    
    const messages = [
      {
        role: 'user' as const,
        content: `Answer this query using ONLY the provided sources. Include citations.

Query: ${query}

Sources:
${context}

Format: Answer with [citation numbers] for each claim.
If information is not in sources, say "Information not found in provided documents."`
      }
    ];

    try {
      const response = await this.openRouterClient.generateWithFallback(
        MODEL_CONFIGS.RAG_PIPELINE,
        messages,
        {
          max_tokens: 800,
          temperature: 0.2
        }
      );
      
      console.log(`📄 RAG synthesis using ${response.modelUsed}`);
      return response.response;
      
    } catch (error) {
      console.warn('OpenRouter failed for RAG synthesis, using Gemini fallback:', error);
      
      // Fallback to Gemini
      const response = await this.crossEncoder.generateContent(messages[0].content);
      return response.response.text();
    }
  }
}
