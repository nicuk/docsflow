/**
 * Confidence Scoring Utilities
 * 
 * Simple, transparent confidence calculation based on retrieval scores.
 * No complex ML models - just clear, debuggable logic.
 */

export interface ScoredChunk {
  score: number;
  content: string;
  metadata: Record<string, any>;
}

/**
 * Calculate confidence from retrieval scores
 * 
 * Logic:
 * - Average of top retrieval scores
 * - Normalized to 0-100 scale
 * - Simple and transparent
 */
export function calculateConfidence(chunks: ScoredChunk[]): number {
  if (chunks.length === 0) return 0;
  
  // Average the scores
  const avgScore = chunks.reduce((sum, chunk) => sum + chunk.score, 0) / chunks.length;
  
  // Pinecone cosine similarity scores range from 0-1
  // Map to 0-100 scale: score * 100 = percentage
  // Scores of 0.3-0.4 are typical for semantic matches
  const normalized = Math.max(0, Math.min(100, avgScore * 100));
  
  return Math.round(normalized);
}

/**
 * Determine if confidence is sufficient for answering
 * 
 * Threshold: 30% (0.3 hybrid score)
 * - Below 30%: Abstain (not confident enough)
 * - Above 30%: Answer (confident)
 * 
 * HYBRID SEARCH: Raised from 20% to 30% because hybrid search combines:
 * - Semantic similarity (dense vector)
 * - Keyword matching (sparse vector)
 * Result: Better quality matches, so we can require higher confidence
 */
export function isSufficientConfidence(confidence: number): boolean {
  return confidence >= 30;
}

/**
 * Get confidence level description
 */
export function getConfidenceLevel(confidence: number): string {
  if (confidence >= 70) return 'very high';
  if (confidence >= 50) return 'high';
  if (confidence >= 30) return 'moderate';
  if (confidence >= 15) return 'low';
  return 'very low';
}

