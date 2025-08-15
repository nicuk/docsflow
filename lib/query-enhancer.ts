import { GoogleGenerativeAI } from '@google/generative-ai';

interface EnhancedQuery {
  original: string;
  enhanced: string;
  intent: 'factual' | 'analytical' | 'navigational' | 'transactional' | 'exploratory';
  entities: string[];
  keywords: string[];
  expansions: string[];
  corrections: string[];
  confidence: number;
}

interface QueryEnhancementOptions {
  expandSynonyms?: boolean;
  correctSpelling?: boolean;
  extractEntities?: boolean;
  classifyIntent?: boolean;
  domainContext?: string;
}

export class QueryEnhancer {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private commonMisspellings: Map<string, string>;
  private domainSynonyms: Map<string, string[]>;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!key) {
      throw new Error('Google AI API key not configured for query enhancement');
    }
    
    this.genAI = new GoogleGenerativeAI(key);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 512,
      }
    });

    // Initialize common misspellings database
    this.commonMisspellings = new Map([
      ['recieve', 'receive'],
      ['seperate', 'separate'],
      ['occured', 'occurred'],
      ['untill', 'until'],
      ['managment', 'management'],
      ['accomodate', 'accommodate'],
      ['acheive', 'achieve'],
      ['calender', 'calendar'],
      ['collegue', 'colleague'],
      ['concious', 'conscious'],
      ['embarass', 'embarrass'],
      ['existance', 'existence'],
      ['experiance', 'experience'],
      ['independant', 'independent'],
      ['occassion', 'occasion'],
      ['persistant', 'persistent'],
      ['priviledge', 'privilege'],
      ['recomend', 'recommend'],
      ['succesful', 'successful'],
      ['tommorrow', 'tomorrow']
    ]);

    // Initialize domain-specific synonyms
    this.domainSynonyms = new Map([
      ['document', ['file', 'doc', 'paper', 'record', 'report']],
      ['search', ['find', 'look for', 'query', 'retrieve', 'locate']],
      ['upload', ['add', 'import', 'insert', 'load', 'submit']],
      ['delete', ['remove', 'erase', 'clear', 'purge', 'eliminate']],
      ['user', ['person', 'member', 'account', 'profile', 'customer']],
      ['error', ['bug', 'issue', 'problem', 'fault', 'failure']],
      ['api', ['endpoint', 'interface', 'service', 'integration']],
      ['database', ['db', 'storage', 'repository', 'datastore']],
      ['tenant', ['organization', 'company', 'workspace', 'account']],
      ['chat', ['conversation', 'message', 'discussion', 'dialogue']]
    ]);
  }

  /**
   * Enhance a query with multiple techniques
   */
  async enhanceQuery(
    query: string,
    options: QueryEnhancementOptions = {}
  ): Promise<EnhancedQuery> {
    const {
      expandSynonyms = true,
      correctSpelling = true,
      extractEntities = true,
      classifyIntent = true,
      domainContext = ''
    } = options;

    console.log(`Enhancing query: "${query}"`);

    // Step 1: Basic preprocessing
    let processedQuery = this.preprocessQuery(query);

    // Step 2: Spell correction
    const corrections: string[] = [];
    if (correctSpelling) {
      const corrected = this.correctSpelling(processedQuery);
      if (corrected.query !== processedQuery) {
        corrections.push(...corrected.corrections);
        processedQuery = corrected.query;
      }
    }

    // Step 3: AI-powered enhancement
    const aiEnhancement = await this.aiEnhanceQuery(
      processedQuery,
      domainContext,
      { extractEntities, classifyIntent }
    );

    // Step 4: Synonym expansion
    const expansions: string[] = [];
    if (expandSynonyms) {
      expansions.push(...this.expandSynonyms(processedQuery));
      expansions.push(...(aiEnhancement.expansions || []));
    }

    // Step 5: Build enhanced query
    const enhancedQuery = this.buildEnhancedQuery(
      processedQuery,
      aiEnhancement.keywords || [],
      expansions
    );

    return {
      original: query,
      enhanced: enhancedQuery,
      intent: aiEnhancement.intent || 'exploratory',
      entities: aiEnhancement.entities || [],
      keywords: aiEnhancement.keywords || [],
      expansions: [...new Set(expansions)],
      corrections,
      confidence: aiEnhancement.confidence || 0.7
    };
  }

  /**
   * Preprocess query for better analysis
   */
  private preprocessQuery(query: string): string {
    return query
      .toLowerCase()
      .replace(/[^\w\s?]/g, ' ') // Remove special chars except ?
      .replace(/\s+/g, ' ')       // Normalize whitespace
      .trim();
  }

  /**
   * Correct common spelling mistakes
   */
  private correctSpelling(query: string): { query: string; corrections: string[] } {
    const words = query.split(' ');
    const corrections: string[] = [];
    
    const correctedWords = words.map(word => {
      const correction = this.commonMisspellings.get(word);
      if (correction) {
        corrections.push(`${word} → ${correction}`);
        return correction;
      }
      return word;
    });

    return {
      query: correctedWords.join(' '),
      corrections
    };
  }

  /**
   * Use AI to enhance the query
   */
  private async aiEnhanceQuery(
    query: string,
    domainContext: string,
    options: { extractEntities: boolean; classifyIntent: boolean }
  ): Promise<{
    intent?: EnhancedQuery['intent'];
    entities?: string[];
    keywords?: string[];
    expansions?: string[];
    confidence?: number;
  }> {
    const prompt = `Analyze and enhance this search query for a document retrieval system.
${domainContext ? `Domain context: ${domainContext}` : ''}

Query: "${query}"

Provide a JSON response with:
1. intent: Classify as "factual", "analytical", "navigational", "transactional", or "exploratory"
2. entities: Extract named entities (people, places, organizations, products, etc.)
3. keywords: Extract the most important keywords for search
4. expansions: Suggest 2-3 related terms or synonyms that would improve search
5. confidence: Rate your analysis confidence from 0.0 to 1.0

Example response:
{
  "intent": "factual",
  "entities": ["OpenAI", "GPT-4"],
  "keywords": ["artificial", "intelligence", "model"],
  "expansions": ["AI", "machine learning", "neural network"],
  "confidence": 0.85
}

Response:`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      // Parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('AI query enhancement failed:', error);
    }

    // Fallback to basic keyword extraction
    return {
      keywords: query.split(' ').filter(word => word.length > 3),
      confidence: 0.5
    };
  }

  /**
   * Expand query with synonyms
   */
  private expandSynonyms(query: string): string[] {
    const words = query.split(' ');
    const expansions: string[] = [];

    for (const word of words) {
      const synonyms = this.domainSynonyms.get(word);
      if (synonyms) {
        expansions.push(...synonyms);
      }
    }

    return expansions;
  }

  /**
   * Build the final enhanced query
   */
  private buildEnhancedQuery(
    baseQuery: string,
    keywords: string[],
    expansions: string[]
  ): string {
    // Combine base query with important keywords
    const parts = [baseQuery];
    
    // Add keywords not already in query
    const queryWords = new Set(baseQuery.split(' '));
    const newKeywords = keywords.filter(k => !queryWords.has(k.toLowerCase()));
    
    if (newKeywords.length > 0) {
      parts.push(newKeywords.join(' '));
    }

    // Add top expansions
    if (expansions.length > 0) {
      parts.push(expansions.slice(0, 3).join(' '));
    }

    return parts.join(' ');
  }

  /**
   * Quick intent classification without full enhancement
   */
  async classifyIntent(query: string): Promise<EnhancedQuery['intent']> {
    const lowerQuery = query.toLowerCase();

    // Rule-based classification for speed
    if (lowerQuery.includes('how') || lowerQuery.includes('why') || lowerQuery.includes('explain')) {
      return 'analytical';
    }
    if (lowerQuery.includes('what is') || lowerQuery.includes('define') || lowerQuery.includes('meaning')) {
      return 'factual';
    }
    if (lowerQuery.includes('find') || lowerQuery.includes('show') || lowerQuery.includes('where')) {
      return 'navigational';
    }
    if (lowerQuery.includes('create') || lowerQuery.includes('update') || lowerQuery.includes('delete')) {
      return 'transactional';
    }

    return 'exploratory';
  }

  /**
   * Generate multiple query variations for better coverage
   */
  generateQueryVariations(query: string, count: number = 3): string[] {
    const variations: string[] = [query];
    const words = query.split(' ');

    // Variation 1: Reorder words
    if (words.length > 2) {
      const reordered = [...words.slice(1), words[0]].join(' ');
      variations.push(reordered);
    }

    // Variation 2: Add question words
    if (!query.includes('?')) {
      variations.push(`what is ${query}`);
      variations.push(`how does ${query} work`);
    }

    // Variation 3: Use synonyms
    const withSynonyms = words.map(word => {
      const synonyms = this.domainSynonyms.get(word);
      return synonyms && synonyms.length > 0 ? synonyms[0] : word;
    }).join(' ');
    
    if (withSynonyms !== query) {
      variations.push(withSynonyms);
    }

    return [...new Set(variations)].slice(0, count);
  }

  /**
   * Extract key phrases from query
   */
  extractKeyPhrases(query: string): string[] {
    const phrases: string[] = [];
    const words = query.split(' ');

    // Extract bigrams and trigrams
    for (let i = 0; i < words.length - 1; i++) {
      // Bigrams
      phrases.push(`${words[i]} ${words[i + 1]}`);
      
      // Trigrams
      if (i < words.length - 2) {
        phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
      }
    }

    // Filter out common/stop phrases
    const stopPhrases = new Set(['is the', 'in the', 'of the', 'to the', 'and the']);
    return phrases.filter(p => !stopPhrases.has(p) && p.split(' ').some(w => w.length > 3));
  }
}

// Singleton instance
export const queryEnhancer = new QueryEnhancer();
