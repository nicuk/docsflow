import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SemanticReranker, RerankCandidate } from './semantic-reranker';
import { queryEnhancer } from './query-enhancer';
import { ragMetrics } from './rag-metrics';

interface HybridSearchResult {
  chunks: any[];
  searchStrategy: 'vector_only' | 'keyword_only' | 'hybrid_fusion';
  vectorResults: number;
  keywordResults: number;
  fusedResults: number;
  confidence: number;
}

interface SearchChunk {
  id: string;
  content: string;
  document_id: string;
  chunk_index: number;
  similarity?: number;
  keyword_score?: number;
  hybrid_score?: number;
  vector_rank?: number;
  keyword_rank?: number;
  vector_score?: number;
  metadata?: any;
  documents?: any;
}

export class HybridSearch {
  private supabase: any;
  private genAI: GoogleGenerativeAI;
  private embeddingModel: any;
  private reranker: SemanticReranker;

  constructor() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !/* SECURITY FIX: Migrated to secure backend service */) {
      throw new Error('Supabase configuration not available');
    }
    
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      /* SECURITY FIX: Migrated to secure backend service */
    );

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error('Google AI API key not configured');
    }

    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    this.embeddingModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
    this.reranker = new SemanticReranker(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  }

  /**
   * Perform hybrid search combining vector similarity and keyword matching
   * This provides better coverage than either method alone
   */
  async performHybridSearch(
    query: string,
    tenantId: string,
    accessLevel: number,
    options: {
      vectorThreshold?: number;
      maxResults?: number;
      includeKeywordSearch?: boolean;
      fusionStrategy?: 'rrf' | 'weighted' | 'max';
    } = {}
  ): Promise<HybridSearchResult> {
    const {
      vectorThreshold = 0.75,
      maxResults = 15,
      includeKeywordSearch = true,
      fusionStrategy = 'rrf'
    } = options;

    const startTime = Date.now();
    console.log(`Starting hybrid search for: "${query}" (tenant: ${tenantId}, access: ${accessLevel})`);

    // Enhance query for better retrieval
    let enhancedQuery = query;
    try {
      const enhancement = await queryEnhancer.enhanceQuery(query, {
        expandSynonyms: true,
        correctSpelling: true,
        extractEntities: true,
        classifyIntent: true
      });
      enhancedQuery = enhancement.enhanced;
      if (enhancement.corrections.length > 0) {
        console.log(`Query corrections applied: ${enhancement.corrections.join(', ')}`);
      }
      console.log(`Query enhanced: "${query}" → "${enhancedQuery}" (intent: ${enhancement.intent})`);
      
      // Track enhanced query in metrics
      enhancedQuery = enhancement.enhanced;
    } catch (error) {
      console.error('Query enhancement failed, using original:', error);
    }

    try {
      // Step 1: Vector search with enhanced query
      const vectorResults = await this.vectorSearch(enhancedQuery, tenantId, accessLevel, vectorThreshold, maxResults);
      console.log(`Vector search found ${vectorResults.length} results`);

      // Step 2: Keyword search with enhanced query (if enabled)
      let keywordResults: SearchChunk[] = [];
      if (includeKeywordSearch) {
        keywordResults = await this.keywordSearch(enhancedQuery, tenantId, accessLevel, maxResults);
        console.log(`Keyword search found ${keywordResults.length} results`);
      }

      // Step 3: Fusion ranking
      const fusedResults = this.fuseResults(vectorResults, keywordResults, fusionStrategy);
      console.log(`Fusion produced ${fusedResults.length} final results`);

      // Step 4: Semantic reranking for top results
      let finalResults = fusedResults;
      if (fusedResults.length > 0) {
        try {
          const rerankCandidates: RerankCandidate[] = fusedResults.slice(0, maxResults * 2).map(chunk => ({
            id: chunk.id,
            content: chunk.content,
            document_id: chunk.document_id,
            chunk_index: chunk.chunk_index,
            initial_score: chunk.hybrid_score || chunk.similarity || chunk.keyword_score || 0.5,
            metadata: chunk.metadata,
            documents: chunk.documents
          }));

          const { results: rerankedResults } = await this.reranker.rerankResults(
            query,
            rerankCandidates,
            {
              topK: maxResults,
              includeExplanations: false,
              minRelevanceScore: 0.4
            }
          );

          if (rerankedResults.length > 0) {
            finalResults = rerankedResults.map(r => ({
              ...r,
              similarity: r.rerank_score,
              hybrid_score: r.rerank_score,
              reranked: true
            }));
            console.log(`Semantic reranking improved top result score from ${rerankCandidates[0]?.initial_score.toFixed(3)} to ${rerankedResults[0]?.rerank_score.toFixed(3)}`);
          }
        } catch (error) {
          console.error('Reranking failed, using fusion results:', error);
        }
      }

      // Step 5: Calculate overall confidence
      const confidence = this.calculateHybridConfidence(vectorResults, keywordResults, finalResults);

      // Calculate metrics
      const latencyMs = Date.now() - startTime;
      const relevanceScores = finalResults.slice(0, maxResults).map(r => r.similarity || 0);
      const avgRelevance = relevanceScores.length > 0 
        ? relevanceScores.reduce((a, b) => a + b, 0) / relevanceScores.length 
        : 0;

      // Record metrics
      await ragMetrics.recordQueryMetrics({
        query,
        enhanced_query: enhancedQuery !== query ? enhancedQuery : undefined,
        tenant_id: tenantId,
        timestamp: Date.now(),
        latency_ms: latencyMs,
        results_count: finalResults.length,
        vector_results: vectorResults.length,
        keyword_results: keywordResults.length,
        reranked: finalResults.length > 0 && this.reranker !== null,
        cache_hits: 0, // Will be updated when cache is integrated
        cache_misses: 0,
        relevance_scores: relevanceScores,
        avg_relevance: avgRelevance,
        search_strategy: this.determineStrategy(keywordResults, vectorResults, finalResults)
      });

      // Return results
      return {
        chunks: finalResults.slice(0, maxResults),
        searchStrategy: this.determineStrategy(keywordResults, vectorResults, finalResults),
        vectorResults: vectorResults.length,
        keywordResults: keywordResults.length,
        fusedResults: fusedResults.length,
        confidence
      };

    } catch (error) {
      console.error('Hybrid search error:', error);
      
      // Record error in metrics
      await ragMetrics.recordQueryMetrics({
        query,
        enhanced_query: enhancedQuery !== query ? enhancedQuery : undefined,
        tenant_id: tenantId,
        timestamp: Date.now(),
        latency_ms: Date.now() - startTime,
        results_count: 0,
        vector_results: 0,
        keyword_results: 0,
        reranked: false,
        cache_hits: 0,
        cache_misses: 0,
        relevance_scores: [],
        avg_relevance: 0,
        search_strategy: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }

  /**
   * Vector similarity search using embeddings
   */
  private async vectorSearch(
    query: string,
    tenantId: string,
    accessLevel: number,
    threshold: number,
    maxResults: number
  ): Promise<SearchChunk[]> {
    // Generate query embedding
    const result = await this.embeddingModel.embedContent(query);
    const queryEmbedding = result.embedding.values;

    // Search using Supabase function
    // Convert tenantId string to UUID format if needed
    const { data: vectorResults, error: vectorError } = await this.supabase.rpc(
      'similarity_search',
      {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: maxResults,
        tenant_filter: tenantId, 
        access_level_filter: accessLevel 
      }
    );

    if (vectorError) {
      console.error('Vector search error:', vectorError);
      return [];
    }

    return (vectorResults || []).map((chunk: any) => ({
      ...chunk,
      similarity: chunk.similarity || 0.5,
      search_type: 'vector'
    }));
  }

  /**
   * Keyword-based search using PostgreSQL full-text search
   */
  private async keywordSearch(
    query: string,
    tenantId: string,
    accessLevel: number,
    maxResults: number
  ): Promise<SearchChunk[]> {
    // Prepare query for full-text search
    const searchQuery = this.prepareKeywordQuery(query);
    
    try {
      // Use PostgreSQL full-text search
      const { data, error } = await this.supabase
        .from('document_chunks')
        .select(`
          id,
          content,
          document_id,
          chunk_index,
          metadata,
          documents!inner(filename)
        `)
        .textSearch('content', searchQuery)
        .eq('tenant_id', tenantId)
        .lte('access_level', accessLevel)
        .limit(maxResults * 2);

      if (error) {
        console.error('Keyword search error:', error);
        return [];
      }

      return (data || []).map((chunk: any, index: number) => ({
        ...chunk,
        keyword_score: this.calculateKeywordScore(chunk.content, query),
        search_type: 'keyword',
        rank: index + 1
      }));

    } catch (error) {
      console.error('Keyword search failed:', error);
      // Fallback to simple text matching
      return this.fallbackKeywordSearch(query, tenantId, accessLevel, maxResults);
    }
  }

  /**
   * Fallback keyword search using simple text matching
   */
  private async fallbackKeywordSearch(
    query: string,
    tenantId: string,
    accessLevel: number,
    maxResults: number
  ): Promise<SearchChunk[]> {
    const keywords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    
    if (keywords.length === 0) return [];

    const { data, error } = await this.supabase
      .from('document_chunks')
      .select(`
        id,
        content,
        document_id,
        chunk_index,
        metadata,
        documents!inner(filename)
      `)
      .eq('tenant_id', tenantId)
      .lte('access_level', accessLevel)
      .ilike('content', `%${keywords[0]}%`)
      .limit(maxResults);

    if (error) return [];

    return (data || [])
      .filter((chunk: any) => {
        const content = chunk.content.toLowerCase();
        return keywords.some(keyword => content.includes(keyword));
      })
      .map((chunk: any) => ({
        ...chunk,
        keyword_score: this.calculateKeywordScore(chunk.content, query),
        search_type: 'keyword_fallback'
      }));
  }

  /**
   * Prepare query for PostgreSQL full-text search
   */
  private prepareKeywordQuery(query: string): string {
    // Remove special characters and split into words
    const words = query
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .slice(0, 10); // Limit to 10 words

    // Create OR query for flexibility
    return words.join(' | ');
  }

  /**
   * Determine search strategy based on results
   */
  private determineStrategy(
    keywordResults: SearchChunk[],
    vectorResults: SearchChunk[],
    finalResults: SearchChunk[]
  ): 'vector_only' | 'keyword_only' | 'hybrid_fusion' {
    if (keywordResults.length === 0) return 'vector_only';
    if (vectorResults.length === 0) return 'keyword_only';
    return 'hybrid_fusion';
  }

  /**
   * Calculate keyword relevance score
   */
  private calculateKeywordScore(content: string, query: string): number {
    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    const contentLower = content.toLowerCase();
    
    let score = 0;
    
    for (const word of queryWords) {
      // Exact word match
      if (contentLower.includes(word)) {
        score += 1;
      }
      // Partial match bonus
      if (contentLower.includes(word.slice(0, -1))) {
        score += 0.5;
      }
    }
    
    // Normalize by query length
    return Math.min(1, score / queryWords.length);
  }

  /**
   * Fuse vector and keyword results using different strategies
   */
  private fuseResults(
    vectorResults: SearchChunk[],
    keywordResults: SearchChunk[],
    strategy: 'rrf' | 'weighted' | 'max'
  ): SearchChunk[] {
    if (keywordResults.length === 0) return vectorResults;
    if (vectorResults.length === 0) return keywordResults;

    // Create map for combining results
    const resultMap = new Map<string, SearchChunk>();
    
    // Add vector results
    vectorResults.forEach((chunk, index) => {
      resultMap.set(chunk.id, {
        ...chunk,
        vector_rank: index + 1,
        vector_score: chunk.similarity || 0
      });
    });

    // Add or merge keyword results
    keywordResults.forEach((chunk, index) => {
      const existing = resultMap.get(chunk.id);
      if (existing) {
        // Merge scores
        existing.keyword_rank = index + 1;
        existing.keyword_score = chunk.keyword_score || 0;
      } else {
        resultMap.set(chunk.id, {
          ...chunk,
          keyword_rank: index + 1,
          keyword_score: chunk.keyword_score || 0
        });
      }
    });

    // Convert to array and calculate fusion scores
    const fusedResults = Array.from(resultMap.values()).map(chunk => {
      let hybridScore = 0;

      switch (strategy) {
        case 'rrf': // Reciprocal Rank Fusion
          const vectorRank = chunk.vector_rank || 999;
          const keywordRank = chunk.keyword_rank || 999;
          hybridScore = (1 / (60 + vectorRank)) + (1 / (60 + keywordRank));
          break;

        case 'weighted': // Weighted average
          const vectorScore = chunk.vector_score || 0;
          const keywordScore = chunk.keyword_score || 0;
          hybridScore = (vectorScore * 0.7) + (keywordScore * 0.3);
          break;

        case 'max': // Maximum score
          hybridScore = Math.max(chunk.vector_score || 0, chunk.keyword_score || 0);
          break;
      }

      return {
        ...chunk,
        hybrid_score: hybridScore,
        fusion_strategy: strategy
      };
    });

    // Sort by hybrid score
    return fusedResults.sort((a, b) => (b.hybrid_score || 0) - (a.hybrid_score || 0));
  }

  /**
   * Calculate confidence for hybrid search results
   */
  private calculateHybridConfidence(
    vectorResults: SearchChunk[],
    keywordResults: SearchChunk[],
    fusedResults: SearchChunk[]
  ): number {
    let confidence = 0.5; // Base confidence

    // Boost for having results from both methods
    if (vectorResults.length > 0 && keywordResults.length > 0) {
      confidence += 0.2;
    }

    // Boost for strong vector similarities
    const strongVectorResults = vectorResults.filter(r => (r.similarity || 0) > 0.8);
    if (strongVectorResults.length > 0) {
      confidence += 0.15;
    }

    // Boost for good keyword matches
    const strongKeywordResults = keywordResults.filter(r => (r.keyword_score || 0) > 0.7);
    if (strongKeywordResults.length > 0) {
      confidence += 0.1;
    }

    // Boost for overlapping results (same chunks found by both methods)
    const vectorIds = new Set(vectorResults.map(r => r.id));
    const keywordIds = new Set(keywordResults.map(r => r.id));
    const overlap = [...vectorIds].filter(id => keywordIds.has(id)).length;
    
    if (overlap > 0) {
      confidence += Math.min(0.15, overlap * 0.05);
    }

    return Math.min(0.99, confidence);
  }
} 