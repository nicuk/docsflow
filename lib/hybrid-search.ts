import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

  constructor() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration not available');
    }
    
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error('Google AI API key not configured');
    }

    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    this.embeddingModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
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

    console.log(`Starting hybrid search for: "${query}" (tenant: ${tenantId}, access: ${accessLevel})`);

    try {
      // Step 1: Vector search
      const vectorResults = await this.vectorSearch(query, tenantId, accessLevel, vectorThreshold, maxResults);
      console.log(`Vector search found ${vectorResults.length} results`);

      // Step 2: Keyword search (if enabled)
      let keywordResults: SearchChunk[] = [];
      if (includeKeywordSearch) {
        keywordResults = await this.keywordSearch(query, tenantId, accessLevel, maxResults);
        console.log(`Keyword search found ${keywordResults.length} results`);
      }

      // Step 3: Fusion ranking
      const fusedResults = this.fuseResults(vectorResults, keywordResults, fusionStrategy);
      console.log(`Fusion produced ${fusedResults.length} final results`);

      // Step 4: Calculate overall confidence
      const confidence = this.calculateHybridConfidence(vectorResults, keywordResults, fusedResults);

      return {
        chunks: fusedResults.slice(0, maxResults),
        searchStrategy: keywordResults.length > 0 ? 'hybrid_fusion' : 'vector_only',
        vectorResults: vectorResults.length,
        keywordResults: keywordResults.length,
        fusedResults: fusedResults.length,
        confidence
      };

    } catch (error) {
      console.error('Hybrid search error:', error);
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
    const { data, error } = await this.supabase.rpc('similarity_search', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: maxResults * 2, // Get more results for fusion
      tenant_filter: tenantId ? tenantId : null, // Pass as UUID or null
      access_level_filter: accessLevel
    });

    if (error) {
      console.error('Vector search error:', error);
      return [];
    }

    return (data || []).map((chunk: any) => ({
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