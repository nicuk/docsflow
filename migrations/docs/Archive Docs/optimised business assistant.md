/**
 * Universal Token-Optimized Business Assistant System
 * 
 * Smart context management for ANY business type while controlling token usage.
 * Works for motorcycle dealers, warehouses, restaurants, healthcare, tech companies, etc.
 */

export interface UniversalBusinessContext {
  businessType: string;           // "restaurant", "dental_practice", "tech_startup", etc.
  industryCategory: string;       // "food_service", "healthcare", "technology", etc.  
  keyTerms: string[];            // Business-specific vocabulary
  focusAreas: string[];          // What they care about most
  challengePatterns: string[];   // Common problem types
  decisionTypes: string[];       // Types of decisions they make
  successMetrics: string[];      // How they measure success
}

export interface TokenOptimizedPrompt {
  coreContext: string;      // Essential business context (100-150 tokens)
  documentContext: string;  // Relevant docs (300-500 tokens)
  userQuery: string;        // User question (50-100 tokens)
  instructions: string;     // AI behavior rules (150-200 tokens)
}

/**
 * Universal Business Assistant - Works for Any Industry
 */
export class UniversalBusinessAssistant {
  private static MAX_CONTEXT_TOKENS = 800; // ~$0.002 per query
  private static MAX_DOCUMENT_TOKENS = 500;

  /**
   * Generate optimized business context from ANY business type
   */
  static async generateUniversalContext(discoveryData: {
    businessDescription: string;
    challenges: string;
    decisions: string;
    successMetrics: string;
    informationNeeds: string;
  }): Promise<UniversalBusinessContext> {
    
    const businessType = this.classifyAnyBusiness(discoveryData.businessDescription);
    const keyTerms = this.extractUniversalTerms(discoveryData);
    const focusAreas = this.extractFocusAreas(discoveryData);
    const challengePatterns = this.identifyUniversalChallenges(discoveryData.challenges);
    const decisionTypes = this.extractDecisionTypes(discoveryData.decisions);
    const successMetrics = this.extractSuccessMetrics(discoveryData.successMetrics);
    
    return {
      businessType: businessType.specific,
      industryCategory: businessType.category,
      keyTerms: keyTerms.slice(0, 8),
      focusAreas: focusAreas.slice(0, 5),
      challengePatterns: challengePatterns.slice(0, 3),
      decisionTypes: decisionTypes.slice(0, 4),
      successMetrics: successMetrics.slice(0, 4)
    };
  }

  /**
   * Build token-optimized prompt for ANY business
   */
  static buildUniversalPrompt(
    context: UniversalBusinessContext,
    relevantDocs: string,
    userQuery: string,
    userAccessLevel: number
  ): TokenOptimizedPrompt {
    
    // Ultra-compact core context for ANY business type
    const coreContext = `${context.businessType} specialist. Focus: ${context.focusAreas.slice(0, 3).join(', ')}. Key terms: ${context.keyTerms.slice(0, 4).join(', ')}.`;

    // Smart document filtering
    const documentContext = this.filterRelevantContent(relevantDocs, userQuery, context);

    // Universal but personalized instructions
    const instructions = `Answer using ONLY provided docs. Cite sources. Use ${context.industryCategory} terminology: ${context.keyTerms.slice(0, 3).join(', ')}. Focus on ${context.focusAreas[0]}. Access level ${userAccessLevel}. Be specific and actionable for ${context.businessType}.`;

    return {
      coreContext,
      documentContext,
      userQuery,
      instructions
    };
  }

  /**
   * Universal business classification - works for ANY industry
   */
  private static classifyAnyBusiness(description: string): { category: string; specific: string } {
    const lower = description.toLowerCase();
    
    // Healthcare patterns
    if (lower.includes('dental') || lower.includes('dentist')) {
      return { category: 'healthcare', specific: 'dental_practice' };
    }
    if (lower.includes('medical') || lower.includes('doctor') || lower.includes('clinic') || lower.includes('hospital')) {
      return { category: 'healthcare', specific: 'medical_practice' };
    }
    if (lower.includes('veterinary') || lower.includes('vet') || lower.includes('animal')) {
      return { category: 'healthcare', specific: 'veterinary_practice' };
    }

    // Food service patterns
    if (lower.includes('restaurant') || lower.includes('cafe') || lower.includes('dining')) {
      return { category: 'food_service', specific: 'restaurant' };
    }
    if (lower.includes('catering') || lower.includes('events')) {
      return { category: 'food_service', specific: 'catering_business' };
    }
    if (lower.includes('bakery') || lower.includes('pastry')) {
      return { category: 'food_service', specific: 'bakery' };
    }

    // Automotive patterns
    if (lower.includes('motorcycle') || lower.includes('bike') && (lower.includes('dealer') || lower.includes('shop'))) {
      return { category: 'automotive', specific: 'motorcycle_dealer' };
    }
    if (lower.includes('car') && lower.includes('dealer')) {
      return { category: 'automotive', specific: 'car_dealership' };
    }
    if (lower.includes('auto repair') || lower.includes('mechanic')) {
      return { category: 'automotive', specific: 'auto_repair' };
    }

    // Logistics patterns
    if (lower.includes('warehouse') || lower.includes('distribution') || lower.includes('fulfillment')) {
      return { category: 'logistics', specific: 'warehouse_distributor' };
    }
    if (lower.includes('shipping') || lower.includes('freight') || lower.includes('trucking')) {
      return { category: 'logistics', specific: 'shipping_company' };
    }

    // Technology patterns
    if (lower.includes('software') || lower.includes('app') || lower.includes('saas')) {
      return { category: 'technology', specific: 'software_company' };
    }
    if (lower.includes('web') && (lower.includes('design') || lower.includes('development'))) {
      return { category: 'technology', specific: 'web_agency' };
    }

    // Professional services patterns
    if (lower.includes('law') || lower.includes('legal') || lower.includes('attorney')) {
      return { category: 'professional_services', specific: 'law_firm' };
    }
    if (lower.includes('accounting') || lower.includes('bookkeeping') || lower.includes('tax')) {
      return { category: 'professional_services', specific: 'accounting_firm' };
    }
    if (lower.includes('consulting') || lower.includes('advisory')) {
      return { category: 'professional_services', specific: 'consulting_firm' };
    }

    // Real estate patterns
    if (lower.includes('real estate') || lower.includes('property') || lower.includes('realtor')) {
      return { category: 'real_estate', specific: 'real_estate_agency' };
    }

    // Manufacturing patterns
    if (lower.includes('manufacturing') || lower.includes('factory') || lower.includes('production')) {
      return { category: 'manufacturing', specific: 'manufacturer' };
    }

    // Construction patterns
    if (lower.includes('construction') || lower.includes('contractor') || lower.includes('building')) {
      return { category: 'construction', specific: 'construction_company' };
    }

    // Retail patterns
    if (lower.includes('retail') || lower.includes('store') || lower.includes('shop')) {
      return { category: 'retail', specific: 'retail_store' };
    }

    // Education patterns
    if (lower.includes('school') || lower.includes('education') || lower.includes('training')) {
      return { category: 'education', specific: 'educational_institution' };
    }

    // Fitness patterns
    if (lower.includes('gym') || lower.includes('fitness') || lower.includes('personal training')) {
      return { category: 'fitness', specific: 'fitness_center' };
    }

    // Beauty patterns
    if (lower.includes('salon') || lower.includes('spa') || lower.includes('beauty')) {
      return { category: 'beauty', specific: 'beauty_salon' };
    }

    // Default fallback
    return { category: 'general_business', specific: 'business' };
  }

  /**
   * Extract universal business terms from ANY business description
   */
  private static extractUniversalTerms(discoveryData: any): string[] {
    const allText = Object.values(discoveryData).join(' ').toLowerCase();
    
    // Universal business terms that appear in most industries
    const universalTerms = ['revenue', 'customers', 'sales', 'operations', 'costs', 'efficiency', 'growth', 'performance', 'quality', 'service'];
    
    // Industry-specific term patterns
    const industryTerms = {
      healthcare: ['patients', 'appointments', 'insurance', 'treatments', 'diagnosis', 'billing'],
      food_service: ['menu', 'orders', 'kitchen', 'dining', 'ingredients', 'reservations'],
      automotive: ['vehicles', 'inventory', 'financing', 'service', 'parts', 'trade-ins'],
      logistics: ['inventory', 'shipping', 'orders', 'suppliers', 'distribution', 'fulfillment'],
      technology: ['users', 'features', 'platform', 'analytics', 'conversion', 'retention'],
      professional_services: ['clients', 'projects', 'billable', 'expertise', 'deliverables', 'proposals'],
      real_estate: ['properties', 'listings', 'clients', 'market', 'commissions', 'showings'],
      manufacturing: ['production', 'quality', 'materials', 'equipment', 'output', 'defects'],
      construction: ['projects', 'materials', 'contractors', 'permits', 'schedules', 'safety'],
      retail: ['products', 'inventory', 'customers', 'sales', 'merchandising', 'margins'],
      education: ['students', 'curriculum', 'enrollment', 'outcomes', 'programs', 'faculty'],
      fitness: ['members', 'classes', 'equipment', 'training', 'nutrition', 'goals'],
      beauty: ['clients', 'appointments', 'services', 'products', 'treatments', 'bookings']
    };

    let relevantTerms = [];

    // Find universal terms that appear in their text
    relevantTerms.push(...universalTerms.filter(term => allText.includes(term)));

    // Find industry-specific terms
    Object.entries(industryTerms).forEach(([industry, terms]) => {
      if (terms.some(term => allText.includes(term))) {
        relevantTerms.push(...terms.filter(term => allText.includes(term)));
      }
    });

    // Extract custom terms that appear multiple times
    const words = allText.match(/\b\w{4,}\b/g) || [];
    const wordCount = {};
    words.forEach(word => {
      if (!universalTerms.includes(word) && word.length > 3) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });

    // Add frequently mentioned custom terms
    Object.entries(wordCount)
      .filter(([word, count]) => count >= 2)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([word]) => relevantTerms.push(word));

    return [...new Set(relevantTerms)];
  }

  /**
   * Extract focus areas from ANY business
   */
  private static extractFocusAreas(discoveryData: any): string[] {
    const allText = Object.values(discoveryData).join(' ').toLowerCase();
    const areas = [];

    // Universal focus area patterns
    const focusPatterns = {
      'customer_satisfaction': ['customer', 'satisfaction', 'experience', 'service'],
      'revenue_growth': ['revenue', 'sales', 'growth', 'profit', 'income'],
      'operational_efficiency': ['efficiency', 'operations', 'process', 'productivity'],
      'cost_control': ['cost', 'expense', 'budget', 'spending'],
      'quality_management': ['quality', 'standards', 'excellence', 'improvement'],
      'inventory_management': ['inventory', 'stock', 'supplies', 'materials'],
      'staff_management': ['staff', 'employees', 'team', 'workforce', 'hiring'],
      'marketing_sales': ['marketing', 'advertising', 'promotion', 'leads'],
      'compliance_safety': ['compliance', 'regulations', 'safety', 'legal'],
      'technology_innovation': ['technology', 'innovation', 'digital', 'automation']
    };

    Object.entries(focusPatterns).forEach(([area, keywords]) => {
      if (keywords.some(keyword => allText.includes(keyword))) {
        areas.push(area.replace('_', ' '));
      }
    });

    return areas.length > 0 ? areas : ['business operations', 'customer service', 'growth'];
  }

  /**
   * Identify universal challenge patterns
   */
  private static identifyUniversalChallenges(challenges: string): string[] {
    const lower = challenges.toLowerCase();
    const patterns = [];

    const challengePatterns = {
      'time_management': ['time', 'slow', 'delay', 'schedule', 'deadline'],
      'cost_optimization': ['cost', 'expensive', 'budget', 'price', 'money'],
      'customer_retention': ['customer', 'retention', 'satisfaction', 'complaints'],
      'staff_productivity': ['staff', 'employee', 'productivity', 'performance', 'training'],
      'inventory_control': ['inventory', 'stock', 'shortage', 'surplus', 'supplies'],
      'quality_issues': ['quality', 'defects', 'errors', 'mistakes', 'standards'],
      'growth_scaling': ['growth', 'scaling', 'expansion', 'capacity', 'demand'],
      'technology_integration': ['technology', 'system', 'software', 'integration', 'digital'],
      'compliance_regulatory': ['compliance', 'regulations', 'legal', 'permits', 'standards'],
      'cash_flow': ['cash flow', 'payment', 'collections', 'billing', 'receivables']
    };

    Object.entries(challengePatterns).forEach(([pattern, keywords]) => {
      if (keywords.some(keyword => lower.includes(keyword))) {
        patterns.push(pattern.replace('_', ' '));
      }
    });

    return patterns.length > 0 ? patterns : ['operational efficiency', 'cost control'];
  }

  /**
   * Extract decision types from ANY business
   */
  private static extractDecisionTypes(decisions: string): string[] {
    const lower = decisions.toLowerCase();
    const types = [];

    const decisionPatterns = {
      'pricing_decisions': ['price', 'pricing', 'cost', 'rate', 'fee'],
      'staffing_decisions': ['staff', 'hire', 'employee', 'team', 'schedule'],
      'inventory_decisions': ['inventory', 'stock', 'order', 'purchase', 'supplier'],
      'marketing_decisions': ['marketing', 'advertising', 'promotion', 'campaign'],
      'investment_decisions': ['invest', 'equipment', 'technology', 'expansion', 'budget'],
      'service_decisions': ['service', 'offering', 'product', 'feature', 'package'],
      'operational_decisions': ['operations', 'process', 'workflow', 'procedure'],
      'strategic_decisions': ['strategy', 'direction', 'goals', 'planning', 'vision'],
      'customer_decisions': ['customer', 'client', 'segment', 'target', 'acquisition'],
      'vendor_decisions': ['vendor', 'supplier', 'partner', 'contractor', 'outsource']
    };

    Object.entries(decisionPatterns).forEach(([type, keywords]) => {
      if (keywords.some(keyword => lower.includes(keyword))) {
        types.push(type.replace('_', ' '));
      }
    });

    return types.length > 0 ? types : ['operational decisions', 'resource allocation'];
  }

  /**
   * Extract success metrics from ANY business
   */
  private static extractSuccessMetrics(metrics: string): string[] {
    const lower = metrics.toLowerCase();
    const extracted = [];

    const metricPatterns = {
      'revenue_growth': ['revenue', 'sales', 'income', 'profit', 'earnings'],
      'customer_satisfaction': ['satisfaction', 'happiness', 'retention', 'loyalty'],
      'operational_efficiency': ['efficiency', 'productivity', 'utilization', 'throughput'],
      'cost_reduction': ['cost', 'expense', 'savings', 'budget', 'margin'],
      'quality_improvement': ['quality', 'defects', 'errors', 'standards', 'excellence'],
      'market_share': ['market', 'competition', 'share', 'position', 'growth'],
      'employee_satisfaction': ['employee', 'staff', 'team', 'morale', 'engagement'],
      'time_savings': ['time', 'speed', 'fast', 'quick', 'efficient'],
      'compliance_rate': ['compliance', 'regulations', 'standards', 'requirements'],
      'innovation_metrics': ['innovation', 'new', 'improvement', 'development']
    };

    Object.entries(metricPatterns).forEach(([metric, keywords]) => {
      if (keywords.some(keyword => lower.includes(keyword))) {
        extracted.push(metric.replace('_', ' '));
      }
    });

    return extracted.length > 0 ? extracted : ['business performance', 'customer satisfaction'];
  }

  /**
   * Smart document content filtering - works for ANY business context
   */
  private static filterRelevantContent(
    documents: string, 
    query: string, 
    context: UniversalBusinessContext
  ): string {
    if (!documents || documents.length === 0) {
      return "No relevant documents found.";
    }

    // Split into chunks and score relevance
    const chunks = documents.split('\n\n').filter(chunk => chunk.trim().length > 20);
    const queryWords = query.toLowerCase().split(' ').filter(word => word.length > 2);
    const contextWords = [
      ...context.keyTerms, 
      ...context.focusAreas, 
      ...context.challengePatterns,
      context.businessType,
      context.industryCategory
    ].map(t => t.toLowerCase());

    const scoredChunks = chunks.map(chunk => {
      const chunkLower = chunk.toLowerCase();
      let score = 0;

      // Score based on query relevance (highest priority)
      queryWords.forEach(word => {
        const occurrences = (chunkLower.match(new RegExp(word, 'g')) || []).length;
        score += occurrences * 3;
      });

      // Score based on business context
      contextWords.forEach(word => {
        if (chunkLower.includes(word)) score += 2;
      });

      // Bonus for numbers/data (business insights)
      const numberMatches = chunk.match(/\d+[%$]?/g) || [];
      score += numberMatches.length;

      // Bonus for business action words
      const actionWords = ['increase', 'decrease', 'improve', 'reduce', 'optimize', 'analyze', 'track', 'measure'];
      actionWords.forEach(word => {
        if (chunkLower.includes(word)) score += 1;
      });

      return { chunk: chunk.trim(), score };
    });

    // Take top-scored chunks within token limit
    const sortedChunks = scoredChunks
      .sort((a, b) => b.score - a.score)
      .filter(item => item.score > 0) // Only relevant content
      .slice(0, 5); // Max 5 most relevant chunks

    if (sortedChunks.length === 0) {
      return "No directly relevant documents found for this query.";
    }

    const filteredContent = sortedChunks
      .map(item => item.chunk)
      .join('\n\n');

    // Truncate if still too long (rough token estimation: 1 token ≈ 4 characters)
    const maxChars = this.MAX_DOCUMENT_TOKENS * 4;
    return filteredContent.length > maxChars 
      ? filteredContent.substring(0, maxChars) + '...[content truncated for token efficiency]'
      : filteredContent;
  }
}

/**
 * Token usage estimation and monitoring for ANY business
 */
export class UniversalTokenMonitor {
  static estimateTokens(text: string): number {
    // More accurate estimation for business content
    // Technical/business text tends to be more token-dense
    return Math.ceil(text.length / 3.5);
  }

  static validatePromptSize(prompt: TokenOptimizedPrompt): {
    isValid: boolean;
    totalTokens: number;
    breakdown: Record<string, number>;
    costEstimate: number;
  } {
    const breakdown = {
      coreContext: this.estimateTokens(prompt.coreContext),
      documentContext: this.estimateTokens(prompt.documentContext),
      userQuery: this.estimateTokens(prompt.userQuery),
      instructions: this.estimateTokens(prompt.instructions)
    };

    const totalTokens = Object.values(breakdown).reduce((sum, tokens) => sum + tokens, 0);
    
    // Rough cost estimation (OpenAI GPT-4 pricing: ~$0.03/1k tokens)
    const costEstimate = (totalTokens / 1000) * 0.03;

    return {
      isValid: totalTokens <= UniversalBusinessAssistant['MAX_CONTEXT_TOKENS'],
      totalTokens,
      breakdown,
      costEstimate: Math.round(costEstimate * 10000) / 10000 // Round to 4 decimal places
    };
  }

  static optimizeForBudget(prompt: TokenOptimizedPrompt, maxTokens: number): TokenOptimizedPrompt {
    const validation = this.validatePromptSize(prompt);
    
    if (validation.isValid) {
      return prompt; // Already within limits
    }

    // Progressively reduce content to fit budget
    let optimizedDocContext = prompt.documentContext;
    
    // First, try truncating document context
    while (this.estimateTokens(optimizedDocContext) > maxTokens * 0.6) {
      const sentences = optimizedDocContext.split('. ');
      if (sentences.length <= 2) break;
      
      sentences.pop(); // Remove last sentence
      optimizedDocContext = sentences.join('. ') + '.';
    }

    // If still too long, reduce core context
    let optimizedCore = prompt.coreContext;
    if (this.estimateTokens(optimizedCore + optimizedDocContext + prompt.userQuery + prompt.instructions) > maxTokens) {
      const parts = optimizedCore.split('. ');
      optimizedCore = parts[0] + '.'; // Keep only the most essential part
    }

    return {
      coreContext: optimizedCore,
      documentContext: optimizedDocContext,
      userQuery: prompt.userQuery,
      instructions: prompt.instructions
    };
  }
}

/**
 * Usage examples for different business types
 */
export const universalExamples = {
  dental_practice: {
    context: {
      businessType: 'dental_practice',
      industryCategory: 'healthcare',
      keyTerms: ['patients', 'appointments', 'insurance', 'treatments', 'billing', 'hygiene'],
      focusAreas: ['patient satisfaction', 'appointment efficiency', 'revenue growth'],
      challengePatterns: ['scheduling issues', 'insurance claims', 'patient retention'],
      decisionTypes: ['treatment planning', 'staffing decisions', 'equipment investments'],
      successMetrics: ['patient satisfaction', 'appointment utilization', 'collection rates']
    }
  },
  
  restaurant: {
    context: {
      businessType: 'restaurant',
      industryCategory: 'food_service',
      keyTerms: ['menu', 'orders', 'kitchen', 'dining', 'ingredients', 'service'],
      focusAreas: ['food quality', 'customer experience', 'cost control'],
      challengePatterns: ['food costs', 'staff turnover', 'customer wait times'],
      decisionTypes: ['menu pricing', 'staffing schedules', 'inventory orders'],
      successMetrics: ['customer satisfaction', 'food cost percentage', 'table turnover']
    }
  },

  tech_startup: {
    context: {
      businessType: 'tech_startup',
      industryCategory: 'technology',
      keyTerms: ['users', 'features', 'platform', 'analytics', 'conversion', 'growth'],
      focusAreas: ['user acquisition', 'product development', 'market fit'],
      challengePatterns: ['user retention', 'product market fit', 'scaling issues'],
      decisionTypes: ['feature prioritization', 'hiring decisions', 'marketing spend'],
      successMetrics: ['monthly active users', 'conversion rates', 'revenue growth']
    }
  }
};

/**
 * Generate optimized prompt for ANY business type
 */
export function generateUniversalBusinessPrompt(context: UniversalBusinessContext): string {
  return `You are a specialized ${context.businessType} business intelligence assistant.

BUSINESS CONTEXT:
- Industry: ${context.industryCategory}
- Business Type: ${context.businessType}
- Key Focus Areas: ${context.focusAreas.join(', ')}
- Success Metrics: ${context.successMetrics.join(', ')}

EXPERTISE AREAS:
${context.challengePatterns.map(challenge => `- ${challenge} optimization`).join('\n')}
${context.decisionTypes.map(decision => `- ${decision} support`).join('\n')}

BUSINESS TERMINOLOGY:
Use industry-specific terms: ${context.keyTerms.join(', ')}

SECURITY RULES (CRITICAL):
1. ONLY reference documents from this specific ${context.businessType}
2. User access level is {userAccessLevel} (1-5) - respect document restrictions
3. If document is above user's access level, say "Contact your manager for this information"

RESPONSE REQUIREMENTS:
- Answer based ONLY on provided documents
- Include source citations with page numbers where possible
- Provide confidence score (0-100%)
- Focus on ${context.focusAreas[0]} and ${context.challengePatterns[0]}
- Use ${context.businessType} terminology and context
- Provide actionable recommendations for ${context.successMetrics[0]}

USER QUESTION: {userQuestion}

AVAILABLE DOCUMENTS (filtered by access level):
{relevantDocuments}

Analyze the documents through the lens of ${context.businessType} operations and provide insights that directly support their ${context.decisionTypes[0]} needs.`;
}/**
 * Token-Optimized Business Assistant System
 * 
 * Smart context management to deliver personalized AI assistance 
 * while controlling token usage for cost efficiency.
 */

export interface BusinessContext {
  industry: string;
  businessType: string;
  keyTerms: string[];
  focusAreas: string[];
  challengePatterns: string[];
}

export interface TokenOptimizedPrompt {
  coreContext: string;      // Essential business context (100-150 tokens)
  documentContext: string;  // Relevant docs (300-500 tokens)
  userQuery: string;        // User question (50-100 tokens)
  instructions: string;     // AI behavior rules (150-200 tokens)
}

/**
 * Smart Business Context Generator
 * Optimized for motorcycle dealers and warehouse distributors
 */
export class BusinessAssistant {
  private static MAX_CONTEXT_TOKENS = 800; // ~$0.002 per query at GPT-4 pricing
  private static MAX_DOCUMENT_TOKENS = 500;

  /**
   * Generate optimized business context from onboarding
   */
  static async generateContext(discoveryData: {
    businessDescription: string;
    challenges: string;
    decisions: string;
  }): Promise<BusinessContext> {
    
    // Smart keyword extraction for business types
    const businessType = this.classifyBusiness(discoveryData.businessDescription);
    const keyTerms = this.extractBusinessTerms(discoveryData.businessDescription);
    const challengePatterns = this.identifyPatterns(discoveryData.challenges);
    
    return {
      industry: businessType.industry,
      businessType: businessType.specific,
      keyTerms: keyTerms.slice(0, 8), // Limit to essential terms
      focusAreas: this.extractFocusAreas(discoveryData.decisions).slice(0, 5),
      challengePatterns: challengePatterns.slice(0, 3)
    };
  }

  /**
   * Build token-optimized prompt for chat API
   */
  static buildOptimizedPrompt(
    context: BusinessContext,
    relevantDocs: string,
    userQuery: string,
    userAccessLevel: number
  ): TokenOptimizedPrompt {
    
    // Ultra-compact core context (motorcycle dealer example)
    const coreContext = context.businessType === 'motorcycle_dealer' 
      ? `Motorcycle dealership assistant. Focus: ${context.focusAreas.join(', ')}. Terms: ${context.keyTerms.join(', ')}.`
      : context.businessType === 'warehouse_distributor'
      ? `Warehouse operations expert. Focus: ${context.focusAreas.join(', ')}. Terms: ${context.keyTerms.join(', ')}.`
      : `${context.industry} business assistant. Focus: ${context.focusAreas.join(', ')}.`;

    // Smart document filtering (only most relevant content)
    const documentContext = this.filterRelevantContent(relevantDocs, userQuery, context);

    // Minimal but effective instructions
    const instructions = `Answer using ONLY provided docs. Cite sources. Use business terms: ${context.keyTerms.slice(0, 3).join(', ')}. Access level ${userAccessLevel}. Be specific and actionable.`;

    return {
      coreContext,
      documentContext,
      userQuery,
      instructions
    };
  }

  /**
   * Classify business type for context optimization
   */
  private static classifyBusiness(description: string): { industry: string; specific: string } {
    const lower = description.toLowerCase();
    
    // Motorcycle business patterns
    if (lower.includes('motorcycle') || lower.includes('bike') || lower.includes('harley') || 
        lower.includes('yamaha') || lower.includes('honda') && lower.includes('dealer')) {
      return { industry: 'automotive', specific: 'motorcycle_dealer' };
    }
    
    // Warehouse/distribution patterns  
    if (lower.includes('warehouse') || lower.includes('distribution') || lower.includes('logistics') ||
        lower.includes('inventory') || lower.includes('shipping')) {
      return { industry: 'logistics', specific: 'warehouse_distributor' };
    }

    // Manufacturing patterns
    if (lower.includes('manufacturing') || lower.includes('production') || lower.includes('factory')) {
      return { industry: 'manufacturing', specific: 'manufacturer' };
    }

    // Professional services
    if (lower.includes('consulting') || lower.includes('advisory') || lower.includes('professional')) {
      return { industry: 'services', specific: 'professional_services' };
    }

    return { industry: 'general', specific: 'business' };
  }

  /**
   * Extract essential business terms for context
   */
  private static extractBusinessTerms(text: string): string[] {
    const motorcycleTerms = ['inventory', 'bikes', 'models', 'financing', 'trade-ins', 'service', 'parts', 'accessories'];
    const warehouseTerms = ['inventory', 'SKU', 'shipments', 'orders', 'suppliers', 'logistics', 'distribution', 'fulfillment'];
    const generalTerms = ['revenue', 'customers', 'sales', 'operations', 'performance', 'costs', 'growth', 'efficiency'];

    const lower = text.toLowerCase();
    let relevantTerms = [];

    if (lower.includes('motorcycle') || lower.includes('bike')) {
      relevantTerms = motorcycleTerms.filter(term => lower.includes(term));
    } else if (lower.includes('warehouse') || lower.includes('distribution')) {
      relevantTerms = warehouseTerms.filter(term => lower.includes(term));
    }

    // Add general business terms found in text
    relevantTerms.push(...generalTerms.filter(term => lower.includes(term)));

    return [...new Set(relevantTerms)];
  }

  /**
   * Smart document content filtering to stay within token limits
   */
  private static filterRelevantContent(
    documents: string, 
    query: string, 
    context: BusinessContext
  ): string {
    if (!documents || documents.length === 0) {
      return "No relevant documents found.";
    }

    // Split into chunks and score relevance
    const chunks = documents.split('\n\n');
    const queryWords = query.toLowerCase().split(' ');
    const contextWords = [...context.keyTerms, ...context.focusAreas].map(t => t.toLowerCase());

    const scoredChunks = chunks.map(chunk => {
      const chunkLower = chunk.toLowerCase();
      let score = 0;

      // Score based on query relevance
      queryWords.forEach(word => {
        if (chunkLower.includes(word)) score += 3;
      });

      // Score based on business context
      contextWords.forEach(word => {
        if (chunkLower.includes(word)) score += 2;
      });

      // Bonus for numbers/data (business insights)
      if (/\d+/.test(chunk)) score += 1;

      return { chunk, score };
    });

    // Take top-scored chunks within token limit
    const sortedChunks = scoredChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // Max 5 most relevant chunks

    const filteredContent = sortedChunks
      .map(item => item.chunk)
      .join('\n\n');

    // Truncate if still too long (rough token estimation: 1 token ≈ 4 characters)
    const maxChars = this.MAX_DOCUMENT_TOKENS * 4;
    return filteredContent.length > maxChars 
      ? filteredContent.substring(0, maxChars) + '...'
      : filteredContent;
  }

  /**
   * Extract focus areas from decision-making patterns
   */
  private static extractFocusAreas(decisions: string): string[] {
    const areas = [];
    const lower = decisions.toLowerCase();

    if (lower.includes('inventory') || lower.includes('stock')) areas.push('inventory management');
    if (lower.includes('customer') || lower.includes('client')) areas.push('customer relations');
    if (lower.includes('sales') || lower.includes('revenue')) areas.push('sales performance');
    if (lower.includes('cost') || lower.includes('expense')) areas.push('cost control');
    if (lower.includes('efficiency') || lower.includes('process')) areas.push('operational efficiency');
    if (lower.includes('growth') || lower.includes('expand')) areas.push('business growth');

    return areas.length > 0 ? areas : ['business operations', 'performance analysis'];
  }

  /**
   * Identify challenge patterns for better context
   */
  private static identifyPatterns(challenges: string): string[] {
    const patterns = [];
    const lower = challenges.toLowerCase();

    if (lower.includes('time') || lower.includes('slow')) patterns.push('time efficiency');
    if (lower.includes('cost') || lower.includes('expensive')) patterns.push('cost optimization');
    if (lower.includes('customer') || lower.includes('satisfaction')) patterns.push('customer satisfaction');
    if (lower.includes('inventory') || lower.includes('stock')) patterns.push('inventory control');
    if (lower.includes('staff') || lower.includes('employee')) patterns.push('workforce management');

    return patterns;
  }
}

/**
 * Usage example for motorcycle dealer
 */
export const motorcycleDealerExample = {
  context: {
    industry: 'automotive',
    businessType: 'motorcycle_dealer',
    keyTerms: ['inventory', 'bikes', 'financing', 'trade-ins', 'service'],
    focusAreas: ['inventory management', 'sales performance', 'customer relations'],
    challengePatterns: ['inventory control', 'customer satisfaction']
  },
  optimizedPrompt: `Motorcycle dealership assistant. Focus: inventory management, sales performance. Terms: inventory, bikes, financing.

DOCS: [Filtered bike inventory data, recent sales reports]

USER: "What bikes should I focus on selling this month?"

Answer using bike inventory data. Cite sources. Focus on sales performance and inventory turnover. Be specific about models and financial impact.`
};

/**
 * Token usage estimation and monitoring
 */
export class TokenMonitor {
  static estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  static validatePromptSize(prompt: TokenOptimizedPrompt): {
    isValid: boolean;
    totalTokens: number;
    breakdown: Record<string, number>;
  } {
    const breakdown = {
      coreContext: this.estimateTokens(prompt.coreContext),
      documentContext: this.estimateTokens(prompt.documentContext),
      userQuery: this.estimateTokens(prompt.userQuery),
      instructions: this.estimateTokens(prompt.instructions)
    };

    const totalTokens = Object.values(breakdown).reduce((sum, tokens) => sum + tokens, 0);

    return {
      isValid: totalTokens <= BusinessAssistant['MAX_CONTEXT_TOKENS'],
      totalTokens,
      breakdown
    };
  }
}