/**
 * Edge Case Handler for Enhanced RAG System
 * Handles various edge cases and potential failures gracefully
 */

export interface EdgeCaseResult {
  handled: boolean;
  fallbackResponse?: string;
  suggestedAction?: string;
  errorType?: string;
}

export class RAGEdgeCaseHandler {
  /**
   * Handle empty or null query
   */
  handleEmptyQuery(query: string | null | undefined): EdgeCaseResult {
    if (!query || query.trim().length === 0) {
      return {
        handled: true,
        fallbackResponse: "Please provide a question or query.",
        suggestedAction: "Enter a specific question about your documents.",
        errorType: "empty_query"
      };
    }
    return { handled: false };
  }

  /**
   * Handle queries that are too long
   */
  handleLongQuery(query: string, maxLength: number = 1000): EdgeCaseResult {
    if (query.length > maxLength) {
      return {
        handled: true,
        fallbackResponse: `Your query is too long (${query.length} characters). Please shorten it to under ${maxLength} characters.`,
        suggestedAction: "Break down your question into smaller, more specific queries.",
        errorType: "query_too_long"
      };
    }
    return { handled: false };
  }

  /**
   * Handle no documents found scenario
   */
  handleNoDocuments(documentCount: number): EdgeCaseResult {
    if (documentCount === 0) {
      return {
        handled: true,
        fallbackResponse: "No documents found in your workspace. Please upload documents first.",
        suggestedAction: "Upload relevant documents to enable RAG search.",
        errorType: "no_documents"
      };
    }
    return { handled: false };
  }

  /**
   * Handle low confidence results
   */
  handleLowConfidence(confidence: number, threshold: number = 0.5): EdgeCaseResult {
    if (confidence < threshold) {
      return {
        handled: true,
        fallbackResponse: "I found some information but the confidence is too low to provide a reliable answer.",
        suggestedAction: "Try rephrasing your question or uploading more relevant documents.",
        errorType: "low_confidence"
      };
    }
    return { handled: false };
  }

  /**
   * Handle API rate limiting
   */
  handleRateLimit(error: any): EdgeCaseResult {
    if (error?.status === 429 || error?.message?.includes('rate limit')) {
      return {
        handled: true,
        fallbackResponse: "Too many requests. Please wait a moment before trying again.",
        suggestedAction: "Wait 30 seconds before making another request.",
        errorType: "rate_limit"
      };
    }
    return { handled: false };
  }

  /**
   * Handle database connection errors
   */
  handleDatabaseError(error: any): EdgeCaseResult {
    if (error?.code === 'ECONNREFUSED' || error?.message?.includes('database')) {
      return {
        handled: true,
        fallbackResponse: "Unable to connect to the database. Please try again later.",
        suggestedAction: "Contact support if the issue persists.",
        errorType: "database_error"
      };
    }
    return { handled: false };
  }

  /**
   * Handle embedding generation failures
   */
  handleEmbeddingError(error: any): EdgeCaseResult {
    if (error?.message?.includes('embedding') || error?.message?.includes('vector')) {
      return {
        handled: true,
        fallbackResponse: "Failed to process your query. Please try a simpler question.",
        suggestedAction: "Simplify your query or try different keywords.",
        errorType: "embedding_error"
      };
    }
    return { handled: false };
  }

  /**
   * Handle malformed or injection queries
   */
  handleMaliciousQuery(query: string): EdgeCaseResult {
    const suspiciousPatterns = [
      /(\bDROP\s+TABLE\b|\bDELETE\s+FROM\b|\bUPDATE\s+SET\b)/i,
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(query)) {
        return {
          handled: true,
          fallbackResponse: "Invalid query detected. Please provide a legitimate question.",
          suggestedAction: "Ask a normal question about your documents.",
          errorType: "malicious_query"
        };
      }
    }
    return { handled: false };
  }

  /**
   * Handle timeout scenarios
   */
  handleTimeout(elapsedTime: number, maxTime: number = 30000): EdgeCaseResult {
    if (elapsedTime > maxTime) {
      return {
        handled: true,
        fallbackResponse: "Request timed out. The query may be too complex.",
        suggestedAction: "Try a simpler query or break it into smaller questions.",
        errorType: "timeout"
      };
    }
    return { handled: false };
  }

  /**
   * Handle conflicting temporal information
   */
  handleTemporalConflict(conflicts: any[]): EdgeCaseResult {
    if (conflicts && conflicts.length > 0) {
      const conflictSummary = conflicts.map(c => 
        `${c.entity}: ${c.dates.join(' vs ')}`
      ).join(', ');
      
      return {
        handled: true,
        fallbackResponse: `Found conflicting temporal information: ${conflictSummary}. Using the most recent document.`,
        suggestedAction: "Verify document dates and upload the correct version if needed.",
        errorType: "temporal_conflict"
      };
    }
    return { handled: false };
  }

  /**
   * Main edge case handler
   */
  async handleEdgeCases(
    query: string | null | undefined,
    context: {
      documentCount?: number;
      confidence?: number;
      error?: any;
      elapsedTime?: number;
      conflicts?: any[];
    } = {}
  ): Promise<EdgeCaseResult> {
    // Check each edge case in order of priority
    const checks = [
      () => this.handleEmptyQuery(query),
      () => this.handleMaliciousQuery(query || ''),
      () => this.handleLongQuery(query || ''),
      () => this.handleNoDocuments(context.documentCount || 0),
      () => this.handleRateLimit(context.error),
      () => this.handleDatabaseError(context.error),
      () => this.handleEmbeddingError(context.error),
      () => this.handleTimeout(context.elapsedTime || 0),
      () => this.handleLowConfidence(context.confidence || 0),
      () => this.handleTemporalConflict(context.conflicts || [])
    ];

    for (const check of checks) {
      const result = check();
      if (result.handled) {
        return result;
      }
    }

    return { handled: false };
  }
}

export default RAGEdgeCaseHandler;
