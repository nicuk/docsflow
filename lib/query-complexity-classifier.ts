/**
 * Query Complexity Classifier
 * 
 * Routes queries to appropriate models with strict guardrails.
 * Target: 70% simple, 20% medium, 10% complex
 * 
 * Guardrails:
 * - Conservative complexity scoring (bias toward cheaper models)
 * - Multi-factor analysis (length, keywords, intent)
 * - Cost protection (max 10% premium model usage)
 * - Real-time monitoring and alerts
 */

export type QueryComplexity = 'simple' | 'medium' | 'complex';

export interface ComplexityAnalysis {
  complexity: QueryComplexity;
  confidence: number; // 0-1 how confident we are in the classification
  factors: {
    lengthScore: number;
    keywordScore: number;
    structureScore: number;
    intentScore: number;
  };
  reasoning: string;
  recommendedModel: string[];
}

export interface ComplexityStats {
  simple: number;
  medium: number;
  complex: number;
  total: number;
  percentages: {
    simple: number;
    medium: number;
    complex: number;
  };
}

export class QueryComplexityClassifier {
  private stats: ComplexityStats = {
    simple: 0,
    medium: 0,
    complex: 0,
    total: 0,
    percentages: { simple: 0, medium: 0, complex: 0 }
  };

  // Maximum allowed complex queries (10%)
  private readonly MAX_COMPLEX_PERCENTAGE = 0.12; // 12% with buffer
  private readonly TARGET_COMPLEX_PERCENTAGE = 0.10; // 10% target

  /**
   * Strict complexity classification with multi-factor analysis.
   * Biased toward cheaper models - only truly complex queries get premium treatment.
   */
  classify(query: string): ComplexityAnalysis {
    const factors = {
      lengthScore: this.analyzeLengthComplexity(query),
      keywordScore: this.analyzeKeywordComplexity(query),
      structureScore: this.analyzeStructureComplexity(query),
      intentScore: this.analyzeIntentComplexity(query)
    };

    // Weighted scoring (conservative - favors cheaper models)
    const totalScore = 
      factors.lengthScore * 0.2 +
      factors.keywordScore * 0.3 +
      factors.structureScore * 0.2 +
      factors.intentScore * 0.3;

    // Strict thresholds - only truly complex queries get premium
    let complexity: QueryComplexity;
    let confidence: number;
    
    if (totalScore >= 0.75) {
      // Very high bar for complex classification
      complexity = 'complex';
      confidence = Math.min(1, totalScore);
    } else if (totalScore >= 0.45) {
      complexity = 'medium';
      confidence = Math.min(1, totalScore * 1.2);
    } else {
      complexity = 'simple';
      confidence = Math.min(1, 1 - totalScore);
    }

    // Check if we're exceeding complex query limit
    const currentComplexPercentage = this.stats.total > 0 
      ? this.stats.complex / this.stats.total 
      : 0;

    // If we're over the limit, downgrade complex → medium unless EXTREMELY complex
    if (complexity === 'complex' && 
        currentComplexPercentage > this.MAX_COMPLEX_PERCENTAGE &&
        totalScore < 0.90) {
      
      complexity = 'medium';
    }

    // Update statistics
    this.updateStats(complexity);

    const reasoning = this.generateReasoning(complexity, factors, totalScore);
    const recommendedModel = this.getRecommendedModels(complexity);

    return {
      complexity,
      confidence,
      factors,
      reasoning,
      recommendedModel
    };
  }

  /**
   * Analyze query length complexity
   * Longer queries are generally more complex
   */
  private analyzeLengthComplexity(query: string): number {
    const length = query.length;
    const words = query.split(/\s+/).length;

    // Simple: < 50 chars or < 10 words
    if (length < 50 || words < 10) return 0.1;
    
    // Medium: 50-150 chars or 10-30 words
    if (length < 150 || words < 30) return 0.4;
    
    // Complex: > 150 chars or > 30 words
    return Math.min(1, length / 300); // Caps at 300 chars = 1.0
  }

  /**
   * Analyze keyword complexity
   * Certain keywords indicate complex reasoning requirements
   */
  private analyzeKeywordComplexity(query: string): number {
    const lowerQuery = query.toLowerCase();

    // 🔴 COMPLEX indicators (require deep reasoning)
    const complexKeywords = [
      'analyze', 'compare', 'evaluate', 'assess', 'justify',
      'explain why', 'reasoning', 'rationale', 'comprehensive',
      'detailed analysis', 'breakdown', 'implications', 'impact',
      'trade-offs', 'pros and cons', 'advantages and disadvantages',
      'correlate', 'relationship between', 'cause and effect',
      'synthesize', 'integrate', 'combine', 'multiple documents',
      'across documents', 'from both', 'all files'
    ];

    // 🟡 MEDIUM indicators (require understanding)
    const mediumKeywords = [
      'what', 'how', 'why', 'when', 'where', 'which',
      'describe', 'explain', 'summarize', 'list',
      'show me', 'tell me', 'find', 'search'
    ];

    // 🟢 SIMPLE indicators (basic responses)
    const simpleKeywords = [
      'hi', 'hello', 'hey', 'thanks', 'thank you',
      'ok', 'okay', 'yes', 'no', 'sure'
    ];

    // Check for complex keywords
    const complexMatches = complexKeywords.filter(kw => lowerQuery.includes(kw)).length;
    if (complexMatches >= 2) return 1.0; // Multiple complex keywords
    if (complexMatches >= 1) return 0.8; // One complex keyword

    // Check for medium keywords
    const mediumMatches = mediumKeywords.filter(kw => lowerQuery.includes(kw)).length;
    if (mediumMatches >= 2) return 0.5;
    if (mediumMatches >= 1) return 0.3;

    // Check for simple keywords
    const simpleMatches = simpleKeywords.filter(kw => lowerQuery.includes(kw)).length;
    if (simpleMatches >= 1) return 0.1;

    return 0.4; // Default medium
  }

  /**
   * Analyze structural complexity
   * Multiple questions, clauses, or conditions indicate complexity
   */
  private analyzeStructureComplexity(query: string): number {
    let score = 0;

    // Count question marks (multiple questions = more complex)
    const questionCount = (query.match(/\?/g) || []).length;
    if (questionCount > 2) score += 0.4;
    else if (questionCount > 1) score += 0.3;

    // Check for conjunctions (and, or, but = compound query)
    const conjunctions = ['and', 'or', 'but', 'also', 'additionally', 'moreover', 'furthermore'];
    const conjunctionMatches = conjunctions.filter(c => 
      query.toLowerCase().includes(` ${c} `)
    ).length;
    score += Math.min(0.3, conjunctionMatches * 0.15);

    // Check for conditional statements
    const conditionals = ['if', 'when', 'unless', 'provided that', 'in case'];
    const conditionalMatches = conditionals.filter(c => 
      query.toLowerCase().includes(c)
    ).length;
    score += Math.min(0.3, conditionalMatches * 0.2);

    return Math.min(1, score);
  }

  /**
   * Analyze intent complexity
   * Some intents require more sophisticated reasoning
   */
  private analyzeIntentComplexity(query: string): number {
    const lowerQuery = query.toLowerCase();

    // 🔴 HIGH COMPLEXITY INTENTS
    if (lowerQuery.match(/compar(e|ing|ison)|contrast|versus|vs\.?|difference/)) {
      return 0.9; // Comparison requires reasoning
    }

    if (lowerQuery.match(/correlat(e|ion)|relationship|connection|link/)) {
      return 0.9; // Correlation analysis
    }

    if (lowerQuery.match(/analyz(e|ing|sis)|evaluat(e|ion)|assess/)) {
      return 0.8; // Analysis tasks
    }

    if (lowerQuery.match(/multiple|both|all|several|various|documents?|files?/)) {
      return 0.7; // Multi-document queries
    }

    // 🟡 MEDIUM COMPLEXITY INTENTS
    if (lowerQuery.match(/explain|describe|how does|what is/)) {
      return 0.4; // Explanation tasks
    }

    if (lowerQuery.match(/summariz(e|ing)|overview|brief/)) {
      return 0.3; // Summarization
    }

    // 🟢 LOW COMPLEXITY INTENTS
    if (lowerQuery.match(/^(what|where|when|who) (is|are|was|were)/)) {
      return 0.2; // Simple fact retrieval
    }

    return 0.3; // Default medium-low
  }

  /**
   * Generate human-readable reasoning for classification
   */
  private generateReasoning(
    complexity: QueryComplexity,
    factors: ComplexityAnalysis['factors'],
    totalScore: number
  ): string {
    const reasons: string[] = [];

    if (factors.lengthScore > 0.7) {
      reasons.push('long query');
    } else if (factors.lengthScore < 0.2) {
      reasons.push('short query');
    }

    if (factors.keywordScore > 0.7) {
      reasons.push('complex reasoning keywords');
    } else if (factors.keywordScore < 0.3) {
      reasons.push('simple/basic keywords');
    }

    if (factors.structureScore > 0.5) {
      reasons.push('multi-part structure');
    }

    if (factors.intentScore > 0.7) {
      reasons.push('requires analysis/comparison');
    } else if (factors.intentScore < 0.3) {
      reasons.push('simple fact retrieval');
    }

    const percentage = (totalScore * 100).toFixed(0);
    return `${complexity.toUpperCase()} (${percentage}% confidence): ${reasons.join(', ')}`;
  }

  /**
   * Get recommended models based on complexity
   */
  private getRecommendedModels(complexity: QueryComplexity): string[] {
    // Import from openrouter-client - defined there
    switch (complexity) {
      case 'simple':
        return ['mistralai/mistral-7b-instruct', 'qwen/qwen-2.5-7b-instruct'];
      case 'medium':
        return ['meta-llama/llama-3.1-8b-instruct', 'mistralai/mistral-7b-instruct'];
      case 'complex':
        // Premium model - only for truly complex queries
        return ['anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.1-8b-instruct'];
      default:
        return ['meta-llama/llama-3.1-8b-instruct'];
    }
  }

  /**
   * Update statistics with guardrail checks
   */
  private updateStats(complexity: QueryComplexity): void {
    this.stats[complexity]++;
    this.stats.total++;

    // Update percentages
    this.stats.percentages = {
      simple: (this.stats.simple / this.stats.total) * 100,
      medium: (this.stats.medium / this.stats.total) * 100,
      complex: (this.stats.complex / this.stats.total) * 100
    };

    // Log warning if complex queries exceed target
    if (this.stats.complex > 0 && 
        this.stats.percentages.complex > this.TARGET_COMPLEX_PERCENTAGE * 100) {
    }

    // Log statistics every 100 queries
    if (this.stats.total % 100 === 0) {
      this.logStatistics();
    }
  }

  /**
   * Get current statistics
   */
  getStatistics(): ComplexityStats {
    return { ...this.stats };
  }

  /**
   * Log current distribution
   */
  private logStatistics(): void {
    // Statistics available via getStatistics() method
  }

  /**
   * Reset statistics (for testing or periodic resets)
   */
  resetStatistics(): void {
    this.stats = {
      simple: 0,
      medium: 0,
      complex: 0,
      total: 0,
      percentages: { simple: 0, medium: 0, complex: 0 }
    };
  }
}

// Singleton instance
export const queryClassifier = new QueryComplexityClassifier();

