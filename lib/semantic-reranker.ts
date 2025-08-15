import { GoogleGenerativeAI } from '@google/generative-ai';

interface RerankCandidate {
  id: string;
  content: string;
  document_id: string;
  chunk_index: number;
  initial_score: number;
  metadata?: any;
  documents?: any;
}

interface RerankResult {
  id: string;
  content: string;
  document_id: string;
  chunk_index: number;
  initial_score: number;
  rerank_score: number;
  relevance_explanation?: string;
  metadata?: any;
  documents?: any;
}

interface RerankingMetrics {
  candidates_count: number;
  reranked_count: number;
  processing_time_ms: number;
  score_distribution: {
    high_relevance: number;  // > 0.8
    medium_relevance: number; // 0.5 - 0.8
    low_relevance: number;    // < 0.5
  };
  top_score_improvement: number;
}

export class SemanticReranker {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private batchSize: number = 5; // Process in batches to avoid token limits

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!key) {
      throw new Error('Google AI API key not configured for reranking');
    }
    
    this.genAI = new GoogleGenerativeAI(key);
    // Use Gemini Flash for fast, cost-effective reranking
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.1, // Low temperature for consistent scoring
        maxOutputTokens: 2048,
      }
    });
  }

  /**
   * Rerank search results using cross-encoder style semantic similarity
   * This dramatically improves retrieval quality by deeply analyzing query-document relevance
   */
  async rerankResults(
    query: string,
    candidates: RerankCandidate[],
    options: {
      topK?: number;
      includeExplanations?: boolean;
      minRelevanceScore?: number;
      contextHint?: string;
    } = {}
  ): Promise<{
    results: RerankResult[];
    metrics: RerankingMetrics;
  }> {
    const startTime = Date.now();
    const {
      topK = 10,
      includeExplanations = false,
      minRelevanceScore = 0.3,
      contextHint = ''
    } = options;

    console.log(`Starting semantic reranking for ${candidates.length} candidates`);

    if (candidates.length === 0) {
      return {
        results: [],
        metrics: this.createMetrics([], 0, startTime)
      };
    }

    try {
      // Process candidates in batches
      const rerankedResults: RerankResult[] = [];
      
      for (let i = 0; i < candidates.length; i += this.batchSize) {
        const batch = candidates.slice(i, i + this.batchSize);
        const batchResults = await this.rerankBatch(
          query, 
          batch, 
          includeExplanations,
          contextHint
        );
        rerankedResults.push(...batchResults);
      }

      // Sort by rerank score
      rerankedResults.sort((a, b) => b.rerank_score - a.rerank_score);

      // Filter by minimum relevance and limit to topK
      const filteredResults = rerankedResults
        .filter(r => r.rerank_score >= minRelevanceScore)
        .slice(0, topK);

      console.log(`Reranking complete: ${filteredResults.length} results above threshold`);

      return {
        results: filteredResults,
        metrics: this.createMetrics(rerankedResults, candidates.length, startTime)
      };

    } catch (error) {
      console.error('Reranking error:', error);
      // Fallback: return original results sorted by initial score
      return {
        results: candidates
          .sort((a, b) => b.initial_score - a.initial_score)
          .slice(0, topK)
          .map(c => ({
            ...c,
            rerank_score: c.initial_score
          })),
        metrics: this.createMetrics([], candidates.length, startTime)
      };
    }
  }

  /**
   * Rerank a batch of candidates
   */
  private async rerankBatch(
    query: string,
    batch: RerankCandidate[],
    includeExplanations: boolean,
    contextHint: string
  ): Promise<RerankResult[]> {
    const prompt = this.buildRerankingPrompt(query, batch, includeExplanations, contextHint);
    
    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      return this.parseRerankingResponse(response, batch);
    } catch (error) {
      console.error('Batch reranking failed:', error);
      // Return original scores if reranking fails
      return batch.map(c => ({
        ...c,
        rerank_score: c.initial_score * 0.8 // Slight penalty for failed reranking
      }));
    }
  }

  /**
   * Build the reranking prompt for the LLM
   */
  private buildRerankingPrompt(
    query: string,
    batch: RerankCandidate[],
    includeExplanations: boolean,
    contextHint: string
  ): string {
    const contextSection = contextHint ? `\nContext: ${contextHint}\n` : '';
    
    const documentsSection = batch.map((doc, idx) => 
      `Document ${idx + 1}:\n${doc.content.slice(0, 500)}${doc.content.length > 500 ? '...' : ''}`
    ).join('\n\n');

    const prompt = `You are a precision relevance scoring system. Score how relevant each document is to the query.
${contextSection}
Query: "${query}"

${documentsSection}

Score each document from 0.0 to 1.0 based on:
- Direct answer to the query (highest weight)
- Contextual relevance
- Information completeness
- Factual accuracy

${includeExplanations ? 'For each document, provide a brief explanation of the relevance score.' : ''}

Output format (JSON):
[
  {
    "doc_index": 1,
    "relevance_score": 0.95,
    ${includeExplanations ? '"explanation": "Directly answers the query with specific details...",' : ''}
  },
  ...
]

Scores:`;

    return prompt;
  }

  /**
   * Parse the LLM's reranking response
   */
  private parseRerankingResponse(
    response: string,
    batch: RerankCandidate[]
  ): RerankResult[] {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const scores = JSON.parse(jsonMatch[0]);
      
      return batch.map((candidate, idx) => {
        const scoreData = scores.find((s: any) => s.doc_index === idx + 1) || {};
        
        return {
          ...candidate,
          rerank_score: scoreData.relevance_score || candidate.initial_score * 0.7,
          relevance_explanation: scoreData.explanation
        };
      });

    } catch (error) {
      console.error('Failed to parse reranking response:', error);
      // Fallback: use initial scores with slight adjustment
      return batch.map(c => ({
        ...c,
        rerank_score: c.initial_score * 0.85
      }));
    }
  }

  /**
   * Create metrics for the reranking operation
   */
  private createMetrics(
    results: RerankResult[],
    candidatesCount: number,
    startTime: number
  ): RerankingMetrics {
    const scoreDistribution = {
      high_relevance: results.filter(r => r.rerank_score > 0.8).length,
      medium_relevance: results.filter(r => r.rerank_score >= 0.5 && r.rerank_score <= 0.8).length,
      low_relevance: results.filter(r => r.rerank_score < 0.5).length
    };

    const topScoreImprovement = results.length > 0
      ? Math.max(0, results[0].rerank_score - results[0].initial_score)
      : 0;

    return {
      candidates_count: candidatesCount,
      reranked_count: results.length,
      processing_time_ms: Date.now() - startTime,
      score_distribution: scoreDistribution,
      top_score_improvement: topScoreImprovement
    };
  }

  /**
   * Lightweight reranking using similarity scoring (faster but less accurate)
   */
  async fastRerank(
    query: string,
    candidates: RerankCandidate[],
    topK: number = 5
  ): Promise<RerankResult[]> {
    // Use a simpler prompt for faster processing
    const prompt = `Score relevance (0-1) for query "${query}":
${candidates.slice(0, 10).map((c, i) => `${i+1}. ${c.content.slice(0, 100)}...`).join('\n')}

Output only scores as comma-separated: `;

    try {
      const result = await this.model.generateContent(prompt);
      const scores = result.response.text().split(',').map(s => parseFloat(s.trim()));
      
      return candidates
        .slice(0, 10)
        .map((c, i) => ({
          ...c,
          rerank_score: scores[i] || c.initial_score
        }))
        .sort((a, b) => b.rerank_score - a.rerank_score)
        .slice(0, topK);

    } catch (error) {
      console.error('Fast rerank failed:', error);
      return candidates.slice(0, topK).map(c => ({
        ...c,
        rerank_score: c.initial_score
      }));
    }
  }
}

// Export types for use in other modules
export type { RerankCandidate, RerankResult, RerankingMetrics };
