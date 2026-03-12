/**
 * Citation Enhancement System
 * Adds inline citations and quote highlighting to RAG responses
 * Risk: 2/10 (LOW) - Pure enhancement, no architecture changes
 */

export interface CitedResponse {
  text: string;
  citations: Citation[];
  highlightedQuotes: HighlightedQuote[];
}

export interface Citation {
  id: number;
  source: string;
  page?: number;
  confidence: number;
  documentId: string;
}

export interface HighlightedQuote {
  text: string;
  citationId: number;
  startIndex: number;
  endIndex: number;
}

export class CitationEnhancer {
  /**
   * Enhance LLM response with inline citations
   * Adds [1], [2] inline references to source documents
   */
  static enhanceWithCitations(
    response: string,
    sources: any[]
  ): CitedResponse {
    let enhancedText = response;
    const citations: Citation[] = [];
    const highlightedQuotes: HighlightedQuote[] = [];
    
    // Create citations from sources
    sources.forEach((source, index) => {
      const citationId = index + 1;
      citations.push({
        id: citationId,
        source: source.filename || source.source || `Document ${citationId}`,
        page: source.page,
        confidence: source.confidence || 0.8,
        documentId: source.document_id || source.id
      });
    });

    // Smart citation insertion - find sentences that likely came from sources
    const sentences = response.split(/[.!?]+/).filter(s => s.trim());
    
    sentences.forEach((sentence, sentenceIndex) => {
      // Find which source this sentence most likely came from
      const bestSourceMatch = this.findBestSourceMatch(sentence, sources);
      
      if (bestSourceMatch.confidence > 0.7) {
        const citationRef = `[${bestSourceMatch.sourceIndex + 1}]`;
        
        // Replace the sentence with cited version
        const originalSentence = sentence.trim();
        const citedSentence = `${originalSentence}${citationRef}`;
        
        enhancedText = enhancedText.replace(originalSentence, citedSentence);
        
        // Track highlighted quotes
        highlightedQuotes.push({
          text: originalSentence,
          citationId: bestSourceMatch.sourceIndex + 1,
          startIndex: enhancedText.indexOf(originalSentence),
          endIndex: enhancedText.indexOf(originalSentence) + originalSentence.length
        });
      }
    });

    return {
      text: enhancedText,
      citations,
      highlightedQuotes
    };
  }

  /**
   * Find best matching source for a sentence
   */
  private static findBestSourceMatch(
    sentence: string, 
    sources: any[]
  ): { sourceIndex: number; confidence: number } {
    let bestMatch = { sourceIndex: 0, confidence: 0 };
    
    sources.forEach((source, index) => {
      const sourceContent = source.content || source.snippet || '';
      const confidence = this.calculateSimilarity(sentence, sourceContent);
      
      if (confidence > bestMatch.confidence) {
        bestMatch = { sourceIndex: index, confidence };
      }
    });
    
    return bestMatch;
  }

  /**
   * Simple similarity calculation (can be enhanced with embeddings later)
   */
  private static calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Format citations for display
   */
  static formatCitations(citations: Citation[]): string {
    return citations.map(citation => 
      `[${citation.id}] ${citation.source}${citation.page ? ` (page ${citation.page})` : ''}`
    ).join('\n');
  }
}

