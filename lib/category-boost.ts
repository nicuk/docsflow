/**
 * 🎯 Simple Category & Tag Boosting for Search Results
 * Minimal complexity - just boosts scores based on user-defined categories/tags
 */

interface SearchResult {
  content: string;
  source?: string;
  document_id?: string;
  documentId?: string;
  filename?: string;
  score?: number;
  hybridScore?: number;
  confidence?: number;
  metadata?: any;
  provenance?: any;
}

interface BoostOptions {
  preferredCategory?: string;
  tags?: string[];
}

/**
 * Auto-detect query intent to suggest category
 * Simple keyword matching - no LLM needed
 */
export function detectQueryCategory(query: string): string | null {
  const queryLower = query.toLowerCase();
  
  const categoryKeywords: Record<string, string[]> = {
    legal: ['contract', 'legal', 'agreement', 'terms', 'clause', 'law', 'policy'],
    financial: ['revenue', 'cost', 'budget', 'invoice', 'financial', 'payment', 'profit', 'expense'],
    technical: ['code', 'api', 'system', 'technical', 'architecture', 'bug', 'error'],
    data: ['data', 'report', 'metrics', 'analytics', 'statistics', 'chart', 'graph'],
    images: ['image', 'screenshot', 'photo', 'picture', 'diagram', 'visual'],
    marketing: ['marketing', 'campaign', 'content', 'social', 'ads', 'promotion'],
    operations: ['operations', 'process', 'workflow', 'procedure', 'operations'],
    hr: ['hr', 'employee', 'hiring', 'recruitment', 'personnel', 'staff'],
    sales: ['sales', 'customer', 'deal', 'proposal', 'quote', 'pipeline']
  };
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => queryLower.includes(kw))) {
      return category;
    }
  }
  
  return null;
}

/**
 * Boost search results based on category and tags
 * SIMPLE: Just adds to existing scores
 */
export function boostByCategory(
  results: SearchResult[],
  options: BoostOptions
): SearchResult[] {
  if (!options.preferredCategory && !options.tags?.length) {
    // No boosting needed
    return results;
  }
  
  return results.map(result => {
    let boost = 0;
    const docCategory = result.metadata?.category;
    const docTags = result.metadata?.tags || [];
    
    // 🎯 Category Match: +0.2 boost (20% score increase)
    if (options.preferredCategory && docCategory === options.preferredCategory) {
      boost += 0.2;
      const docId = result.documentId || result.document_id || result.filename || 'unknown';
      console.log(`✅ [CATEGORY BOOST] Document "${docId}" matches category "${options.preferredCategory}" (+0.2)`);
    }
    
    // 🎯 Tag Matches: +0.05 per matching tag (max +0.15)
    if (options.tags?.length && docTags.length) {
      const matchingTags = options.tags.filter(tag => docTags.includes(tag));
      const tagBoost = Math.min(matchingTags.length * 0.05, 0.15);
      if (matchingTags.length > 0) {
        boost += tagBoost;
        const docId = result.documentId || result.document_id || result.filename || 'unknown';
        console.log(`✅ [TAG BOOST] Document "${docId}" matches ${matchingTags.length} tags: [${matchingTags.join(', ')}] (+${tagBoost})`);
      }
    }
    
    if (boost > 0) {
      // Apply boost to whichever score exists
      const currentScore = result.hybridScore || result.confidence || result.score || 0;
      const boostedScore = Math.min(currentScore + boost, 1.0); // Cap at 1.0
      
      return {
        ...result,
        hybridScore: boostedScore,
        confidence: result.confidence ? Math.min(result.confidence + boost, 1.0) : result.confidence,
        score: result.score ? Math.min(result.score + boost, 1.0) : result.score,
        metadata: {
          ...result.metadata,
          __boost_applied: boost,
          __matched_category: options.preferredCategory && docCategory === options.preferredCategory,
          __matched_tags: options.tags?.filter(tag => docTags.includes(tag)) || []
        }
      };
    }
    
    return result;
  });
}

/**
 * Filter results by category (strict filtering)
 * Use this when user explicitly selects category filter
 */
export function filterByCategory(
  results: SearchResult[],
  category: string
): SearchResult[] {
  return results.filter(result => {
    const docCategory = result.metadata?.category;
    return docCategory === category;
  });
}

/**
 * Combined: Auto-detect query intent, boost, and optionally filter
 */
export function applyCategoryLogic(
  results: SearchResult[],
  query: string,
  options?: {
    explicitCategory?: string; // User selected category (strict filter)
    tags?: string[];
    autoDetect?: boolean; // Auto-detect query category (default: true)
  }
): SearchResult[] {
  // 1. Strict filter if user explicitly selected category
  if (options?.explicitCategory) {
    console.log(`🔒 [CATEGORY FILTER] Filtering to category: "${options.explicitCategory}"`);
    return filterByCategory(results, options.explicitCategory);
  }
  
  // 2. Auto-detect query category and boost
  const autoDetect = options?.autoDetect !== false; // Default true
  let preferredCategory: string | null = null;
  
  if (autoDetect) {
    preferredCategory = detectQueryCategory(query);
    if (preferredCategory) {
      console.log(`🤖 [AUTO-DETECT] Query suggests category: "${preferredCategory}"`);
    }
  }
  
  // 3. Apply boost (not filter)
  return boostByCategory(results, {
    preferredCategory: preferredCategory || undefined,
    tags: options?.tags
  });
}

