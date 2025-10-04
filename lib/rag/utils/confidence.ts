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
  
  // Pinecone cosine similarity scores are typically 0.5-1.0
  // Map to 0-100 scale: (score - 0.5) * 200 = percentage
  const normalized = Math.max(0, Math.min(100, (avgScore - 0.5) * 200));
  
  return Math.round(normalized);
}

/**
 * Determine if confidence is sufficient for answering
 * 
 * Threshold: 40% (0.7 cosine similarity)
 * - Below 40%: Abstain (not confident enough)
 * - Above 40%: Answer (confident)
 */
export function isSufficientConfidence(confidence: number): boolean {
  return confidence >= 40;
}

/**
 * Get confidence level description
 */
export function getConfidenceLevel(confidence: number): string {
  if (confidence >= 80) return 'very high';
  if (confidence >= 60) return 'high';
  if (confidence >= 40) return 'moderate';
  if (confidence >= 20) return 'low';
  return 'very low';
}

