/**
 * Objective RAG Evaluation Framework
 * Implements RAGAS-style metrics with a gold standard test set
 */

interface GoldStandardQuery {
  id: string;
  query: string;
  expectedAnswer: string;
  requiredFacts: string[];
  category: 'factual' | 'temporal' | 'comparative' | 'entity' | 'complex';
  difficulty: 'easy' | 'medium' | 'hard';
}

interface EvaluationMetrics {
  faithfulness: number;      // Answer grounded in context (0-1)
  answerRelevancy: number;   // Relevance to question (0-1)
  contextPrecision: number;  // Ranking quality (0-1)
  contextRecall: number;     // Coverage of required facts (0-1)
  answerCorrectness: number; // Factual accuracy (0-1)
  overallScore: number;      // Weighted average (0-10)
}

export class RAGEvaluator {
  private goldStandard: GoldStandardQuery[] = [
    // Factual queries
    {
      id: 'fact-1',
      query: 'What is the maximum file upload size?',
      expectedAnswer: '1MB per file',
      requiredFacts: ['1MB', 'file size limit', 'upload'],
      category: 'factual',
      difficulty: 'easy'
    },
    {
      id: 'fact-2',
      query: 'How many files can be uploaded at once?',
      expectedAnswer: 'Maximum 5 files per upload with 3 concurrent uploads',
      requiredFacts: ['5 files', 'maximum', 'per upload', 'concurrent'],
      category: 'factual',
      difficulty: 'easy'
    },
    
    // Temporal queries
    {
      id: 'temp-1',
      query: 'Show me the latest contract for Acme Corp',
      expectedAnswer: 'The most recent contract based on document date, not upload date',
      requiredFacts: ['latest', 'document date', 'Acme Corp'],
      category: 'temporal',
      difficulty: 'medium'
    },
    {
      id: 'temp-2',
      query: 'What changed in the Johnson contract renewal from 6 months ago?',
      expectedAnswer: 'Comparison between original and renewal contract terms',
      requiredFacts: ['Johnson contract', 'renewal', 'changes', '6 months'],
      category: 'temporal',
      difficulty: 'hard'
    },
    
    // Entity resolution queries
    {
      id: 'entity-1',
      query: 'Find all documents for Acme Corporation including subsidiaries',
      expectedAnswer: 'All documents related to Acme Corp, Acme Inc, and related entities',
      requiredFacts: ['Acme', 'subsidiaries', 'related entities'],
      category: 'entity',
      difficulty: 'medium'
    },
    {
      id: 'entity-2',
      query: 'Who are the stakeholders in the Project Alpha agreement?',
      expectedAnswer: 'List of all parties involved in Project Alpha',
      requiredFacts: ['Project Alpha', 'stakeholders', 'parties'],
      category: 'entity',
      difficulty: 'medium'
    },
    
    // Comparative queries
    {
      id: 'comp-1',
      query: 'Compare payment terms across all client contracts',
      expectedAnswer: 'Comparison of payment terms from multiple contracts',
      requiredFacts: ['payment terms', 'comparison', 'multiple contracts'],
      category: 'comparative',
      difficulty: 'hard'
    },
    {
      id: 'comp-2',
      query: 'What is the difference between standard and premium service levels?',
      expectedAnswer: 'Feature comparison between service tiers',
      requiredFacts: ['standard', 'premium', 'service levels', 'differences'],
      category: 'comparative',
      difficulty: 'medium'
    },
    
    // Complex multi-hop queries
    {
      id: 'complex-1',
      query: 'Based on Q3 revenue and the Johnson renewal, should we adjust pricing?',
      expectedAnswer: 'Analysis combining revenue data and contract terms',
      requiredFacts: ['Q3 revenue', 'Johnson renewal', 'pricing analysis'],
      category: 'complex',
      difficulty: 'hard'
    },
    {
      id: 'complex-2',
      query: 'Which contracts expire this year and what is their total value?',
      expectedAnswer: 'List of expiring contracts with aggregated value',
      requiredFacts: ['expiring contracts', 'this year', 'total value'],
      category: 'complex',
      difficulty: 'hard'
    }
  ];

  /**
   * Evaluate faithfulness - is the answer grounded in retrieved context?
   */
  private evaluateFaithfulness(answer: string, context: string[]): number {
    // Check if answer claims are supported by context
    const answerSentences = answer.split(/[.!?]+/).filter(s => s.trim());
    let supportedClaims = 0;
    
    for (const sentence of answerSentences) {
      const words = sentence.toLowerCase().split(/\s+/);
      const isSupported = context.some(ctx => {
        const ctxLower = ctx.toLowerCase();
        return words.filter(w => w.length > 3).some(w => ctxLower.includes(w));
      });
      if (isSupported) supportedClaims++;
    }
    
    return answerSentences.length > 0 ? supportedClaims / answerSentences.length : 0;
  }

  /**
   * Evaluate answer relevancy - does it address the question?
   */
  private evaluateAnswerRelevancy(query: string, answer: string): number {
    const queryWords = new Set(query.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const answerWords = new Set(answer.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    
    let overlap = 0;
    for (const word of queryWords) {
      if (answerWords.has(word)) overlap++;
    }
    
    return queryWords.size > 0 ? overlap / queryWords.size : 0;
  }

  /**
   * Evaluate context precision - are relevant docs ranked higher?
   */
  private evaluateContextPrecision(contexts: any[], relevanceScores: number[]): number {
    if (contexts.length === 0) return 0;
    
    let precisionSum = 0;
    let relevantCount = 0;
    
    for (let i = 0; i < contexts.length; i++) {
      if (relevanceScores[i] > 0.7) {
        relevantCount++;
        precisionSum += relevantCount / (i + 1);
      }
    }
    
    return relevantCount > 0 ? precisionSum / relevantCount : 0;
  }

  /**
   * Evaluate context recall - are all required facts retrieved?
   */
  private evaluateContextRecall(contexts: string[], requiredFacts: string[]): number {
    const contextText = contexts.join(' ').toLowerCase();
    let foundFacts = 0;
    
    for (const fact of requiredFacts) {
      if (contextText.includes(fact.toLowerCase())) {
        foundFacts++;
      }
    }
    
    return requiredFacts.length > 0 ? foundFacts / requiredFacts.length : 0;
  }

  /**
   * Evaluate answer correctness against expected answer
   */
  private evaluateAnswerCorrectness(answer: string, expectedAnswer: string, requiredFacts: string[]): number {
    const answerLower = answer.toLowerCase();
    let factScore = 0;
    
    // Check for required facts
    for (const fact of requiredFacts) {
      if (answerLower.includes(fact.toLowerCase())) {
        factScore++;
      }
    }
    
    const factAccuracy = requiredFacts.length > 0 ? factScore / requiredFacts.length : 0;
    
    // Check semantic similarity (simplified)
    const expectedWords = new Set(expectedAnswer.toLowerCase().split(/\s+/));
    const answerWords = new Set(answerLower.split(/\s+/));
    let semanticOverlap = 0;
    
    for (const word of expectedWords) {
      if (answerWords.has(word)) semanticOverlap++;
    }
    
    const semanticScore = expectedWords.size > 0 ? semanticOverlap / expectedWords.size : 0;
    
    return (factAccuracy * 0.7 + semanticScore * 0.3);
  }

  /**
   * Run complete evaluation on a single query
   */
  async evaluateQuery(
    goldQuery: GoldStandardQuery,
    ragResponse: {
      answer: string;
      contexts: string[];
      relevanceScores: number[];
    }
  ): Promise<EvaluationMetrics> {
    const faithfulness = this.evaluateFaithfulness(ragResponse.answer, ragResponse.contexts);
    const answerRelevancy = this.evaluateAnswerRelevancy(goldQuery.query, ragResponse.answer);
    const contextPrecision = this.evaluateContextPrecision(ragResponse.contexts, ragResponse.relevanceScores);
    const contextRecall = this.evaluateContextRecall(ragResponse.contexts, goldQuery.requiredFacts);
    const answerCorrectness = this.evaluateAnswerCorrectness(
      ragResponse.answer,
      goldQuery.expectedAnswer,
      goldQuery.requiredFacts
    );
    
    // Calculate weighted overall score (0-10 scale)
    const weights = {
      faithfulness: 0.2,
      answerRelevancy: 0.2,
      contextPrecision: 0.15,
      contextRecall: 0.2,
      answerCorrectness: 0.25
    };
    
    const overallScore = (
      faithfulness * weights.faithfulness +
      answerRelevancy * weights.answerRelevancy +
      contextPrecision * weights.contextPrecision +
      contextRecall * weights.contextRecall +
      answerCorrectness * weights.answerCorrectness
    ) * 10;
    
    return {
      faithfulness,
      answerRelevancy,
      contextPrecision,
      contextRecall,
      answerCorrectness,
      overallScore
    };
  }

  /**
   * Run full evaluation suite
   */
  async runFullEvaluation(
    ragSystem: (query: string) => Promise<any>
  ): Promise<{
    overallScore: number;
    categoryScores: Record<string, number>;
    difficultyScores: Record<string, number>;
    detailedResults: any[];
    recommendations: string[];
  }> {
    const results = [];
    const categoryScores: Record<string, number[]> = {};
    const difficultyScores: Record<string, number[]> = {};
    
    for (const goldQuery of this.goldStandard) {
      try {
        // Get RAG response
        const response = await ragSystem(goldQuery.query);
        
        // Evaluate
        const metrics = await this.evaluateQuery(goldQuery, {
          answer: response.response || '',
          contexts: response.contexts || [],
          relevanceScores: response.relevanceScores || []
        });
        
        // Store results
        results.push({
          queryId: goldQuery.id,
          category: goldQuery.category,
          difficulty: goldQuery.difficulty,
          metrics,
          passed: metrics.overallScore >= 7
        });
        
        // Track by category and difficulty
        if (!categoryScores[goldQuery.category]) {
          categoryScores[goldQuery.category] = [];
        }
        categoryScores[goldQuery.category].push(metrics.overallScore);
        
        if (!difficultyScores[goldQuery.difficulty]) {
          difficultyScores[goldQuery.difficulty] = [];
        }
        difficultyScores[goldQuery.difficulty].push(metrics.overallScore);
        
      } catch (error) {
        console.error(`Evaluation failed for query ${goldQuery.id}:`, error);
        results.push({
          queryId: goldQuery.id,
          category: goldQuery.category,
          difficulty: goldQuery.difficulty,
          metrics: {
            faithfulness: 0,
            answerRelevancy: 0,
            contextPrecision: 0,
            contextRecall: 0,
            answerCorrectness: 0,
            overallScore: 0
          },
          passed: false,
          error: error
        });
      }
    }
    
    // Calculate aggregated scores
    const overallScore = results.reduce((sum, r) => sum + r.metrics.overallScore, 0) / results.length;
    
    const categoryAverages = Object.entries(categoryScores).reduce((acc, [cat, scores]) => {
      acc[cat] = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      return acc;
    }, {} as Record<string, number>);
    
    const difficultyAverages = Object.entries(difficultyScores).reduce((acc, [diff, scores]) => {
      acc[diff] = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      return acc;
    }, {} as Record<string, number>);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      overallScore,
      categoryAverages,
      difficultyAverages,
      results
    );
    
    return {
      overallScore,
      categoryScores: categoryAverages,
      difficultyScores: difficultyAverages,
      detailedResults: results,
      recommendations
    };
  }

  private generateRecommendations(
    overallScore: number,
    categoryScores: Record<string, number>,
    difficultyScores: Record<string, number>,
    results: any[]
  ): string[] {
    const recommendations = [];
    
    // Overall score recommendations
    if (overallScore < 6) {
      recommendations.push('🔴 Critical: Implement basic retrieval improvements first');
    } else if (overallScore < 7) {
      recommendations.push('🟡 Priority: Add query rewriting and hybrid search');
    } else if (overallScore < 8) {
      recommendations.push('🟢 Good: Fine-tune reranking and add temporal logic');
    } else {
      recommendations.push('✅ Excellent: Consider advanced features like multi-modal support');
    }
    
    // Category-specific recommendations
    for (const [category, score] of Object.entries(categoryScores)) {
      if (score < 7) {
        switch (category) {
          case 'temporal':
            recommendations.push(`⚠️ Improve temporal reasoning (current: ${score.toFixed(1)}/10)`);
            break;
          case 'entity':
            recommendations.push(`⚠️ Enhance entity resolution (current: ${score.toFixed(1)}/10)`);
            break;
          case 'comparative':
            recommendations.push(`⚠️ Better comparative analysis needed (current: ${score.toFixed(1)}/10)`);
            break;
          case 'complex':
            recommendations.push(`⚠️ Multi-hop reasoning needs work (current: ${score.toFixed(1)}/10)`);
            break;
        }
      }
    }
    
    // Difficulty-based recommendations
    if (difficultyScores['hard'] && difficultyScores['hard'] < 6) {
      recommendations.push('🎯 Focus on complex query decomposition');
    }
    
    // Metric-specific recommendations
    const avgMetrics = {
      faithfulness: results.reduce((sum, r) => sum + r.metrics.faithfulness, 0) / results.length,
      contextRecall: results.reduce((sum, r) => sum + r.metrics.contextRecall, 0) / results.length,
      answerCorrectness: results.reduce((sum, r) => sum + r.metrics.answerCorrectness, 0) / results.length
    };
    
    if (avgMetrics.faithfulness < 0.7) {
      recommendations.push('📚 Improve grounding - answers not well supported by context');
    }
    if (avgMetrics.contextRecall < 0.7) {
      recommendations.push('🔍 Better retrieval needed - missing key information');
    }
    if (avgMetrics.answerCorrectness < 0.7) {
      recommendations.push('✏️ Improve answer generation accuracy');
    }
    
    return recommendations;
  }

  /**
   * Export evaluation report
   */
  exportReport(evaluation: any): string {
    return `
# RAG System Evaluation Report

## Overall Score: ${evaluation.overallScore.toFixed(1)}/10

## Category Performance
${Object.entries(evaluation.categoryScores)
  .map(([cat, score]) => `- ${cat}: ${(score as number).toFixed(1)}/10`)
  .join('\n')}

## Difficulty Breakdown
${Object.entries(evaluation.difficultyScores)
  .map(([diff, score]) => `- ${diff}: ${(score as number).toFixed(1)}/10`)
  .join('\n')}

## Recommendations
${evaluation.recommendations.join('\n')}

## Detailed Results
${evaluation.detailedResults
  .map((r: any) => `
### Query: ${r.queryId} (${r.category}/${r.difficulty})
- Faithfulness: ${(r.metrics.faithfulness * 100).toFixed(0)}%
- Answer Relevancy: ${(r.metrics.answerRelevancy * 100).toFixed(0)}%
- Context Precision: ${(r.metrics.contextPrecision * 100).toFixed(0)}%
- Context Recall: ${(r.metrics.contextRecall * 100).toFixed(0)}%
- Answer Correctness: ${(r.metrics.answerCorrectness * 100).toFixed(0)}%
- **Overall: ${r.metrics.overallScore.toFixed(1)}/10** ${r.passed ? '✅' : '❌'}
`).join('\n')}
`;
  }
}
