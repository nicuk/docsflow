/**
 * Persona Prompt Generator
 * Generates optimized RAG prompts from persona settings
 */

interface PersonaSettings {
  role: string;
  tone: string;
  business_context: string;
  industry: string;
  focus_areas: string[];
  custom_instructions?: string;
}

interface GeneratedPrompts {
  system_prompt: string;
  fallback_prompt: string;
}

/**
 * Generate system prompt from persona settings
 * Creates an optimal RAG prompt that balances customization with accuracy
 */
export function generateSystemPrompt(settings: PersonaSettings): string {
  const { role, tone, business_context, industry, focus_areas } = settings;
  
  return `You are a ${role} with a ${tone} communication style.

Business Context: ${business_context || 'General business intelligence'}
Industry: ${industry || 'general'}
Focus Areas: ${focus_areas?.join(', ') || 'document analysis, business insights'}

🎯 CORE RAG INSTRUCTIONS:
1. ONLY use information explicitly stated in the provided document context
2. If documents don't contain the answer, clearly state "I don't have that information in the available documents"
3. NEVER fabricate information, specifications, numbers, dates, or details
4. When uncertain about any detail, ask the user to provide more specific documents
5. ALWAYS cite which document(s) your answer comes from
6. Maintain ${tone} tone throughout all responses

📋 RESPONSE GUIDELINES:
- Be accurate and source every factual claim
- Use terminology appropriate for ${industry} industry
- Focus on: ${focus_areas?.join(', ') || 'providing helpful insights'}
- Indicate confidence level in your responses
- Suggest relevant follow-up questions when appropriate
- If the query is unclear, politely ask for clarification

❌ NEVER DO:
- Make up information not in documents
- Provide specifications or numbers without source
- Guess at answers when documents don't contain them
- Mix information from different contexts without attribution
- Ignore the ${tone} communication style`;
}

/**
 * Generate fallback prompt for gibberish or unclear input
 * Provides helpful guidance when query doesn't make sense
 */
export function generateFallbackPrompt(settings: PersonaSettings): string {
  const { role, industry, focus_areas } = settings;
  
  const focusAreasText = focus_areas && focus_areas.length > 0
    ? focus_areas.map(area => `- ${area}`).join('\n')
    : '- Document analysis\n- Business insights\n- Decision support';
  
  return `I'm not sure I understood your question correctly. I'm a ${role} specialized in ${industry || 'general business intelligence'}.

I can help you with:
${focusAreasText}

Could you please rephrase your question or ask about one of these topics? For example:
- "What information is in [document name]?"
- "Summarize the key points from my documents"
- "What does the data show about [specific topic]?"`;
}

/**
 * Generate complete prompts from persona settings
 */
export function generatePersonaPrompts(settings: PersonaSettings): GeneratedPrompts {
  return {
    system_prompt: generateSystemPrompt(settings),
    fallback_prompt: generateFallbackPrompt(settings)
  };
}

/**
 * Get default persona for new tenants
 * Provides optimal RAG configuration out of the box
 * 🎯 OPTIMIZED: Best practices for document intelligence and retrieval accuracy
 */
export function getDefaultPersona(): PersonaSettings & GeneratedPrompts {
  const defaultSettings: PersonaSettings = {
    role: 'Document Intelligence Assistant',
    tone: 'Clear, accurate, and helpful',
    business_context: 'Multi-domain document intelligence and business insights. Specialized in extracting actionable information from uploaded documents with high accuracy and proper source attribution.',
    industry: 'general',
    focus_areas: [
      'document analysis and summarization',
      'data extraction and insights',
      'question answering from documents',
      'business intelligence and reporting',
      'information retrieval and search'
    ]
  };
  
  const prompts = generatePersonaPrompts(defaultSettings);
  
  return {
    ...defaultSettings,
    ...prompts
  };
}

/**
 * Validate persona settings
 * Ensures all required fields are present and valid
 */
export function validatePersonaSettings(settings: Partial<PersonaSettings>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!settings.role || settings.role.trim().length < 3) {
    errors.push('Role must be at least 3 characters');
  }
  
  if (!settings.tone || settings.tone.trim().length < 3) {
    errors.push('Tone must be at least 3 characters');
  }
  
  if (settings.focus_areas && settings.focus_areas.length === 0) {
    errors.push('At least one focus area is required');
  }
  
  if (settings.industry && !['general', 'healthcare', 'legal', 'manufacturing', 'real_estate', 'technology', 'finance'].includes(settings.industry)) {
    // Custom industry allowed but not in common list
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Detect if a query is gibberish or unclear
 * Returns true if query should trigger fallback response
 */
export function detectGibberish(query: string): boolean {
  if (!query || typeof query !== 'string') return true;
  
  const trimmed = query.trim();
  
  // 1. Too short (less than 3 characters)
  if (trimmed.length < 3) return true;
  
  // 2. Random special characters (>70% non-alphanumeric)
  const alphanumeric = trimmed.match(/[a-zA-Z0-9]/g) || [];
  if (alphanumeric.length / trimmed.length < 0.3) return true;
  
  // 3. Repeated characters (aaaaaaa, 111111, etc.)
  const repeatedPattern = /(.)\1{7,}/;
  if (repeatedPattern.test(trimmed)) return true;
  
  // 4. No vowels in words > 3 chars (random keyboard mashing)
  const words = trimmed.split(/\s+/);
  const longWords = words.filter(w => w.length > 3);
  if (longWords.length > 0) {
    const wordsWithVowels = longWords.filter(w => /[aeiouAEIOU]/.test(w));
    // If more than 60% of long words have no vowels, likely gibberish
    if (wordsWithVowels.length / longWords.length < 0.4) return true;
  }
  
  // 5. Excessive special characters in a row
  const specialCharsPattern = /[^a-zA-Z0-9\s]{5,}/;
  if (specialCharsPattern.test(trimmed)) return true;
  
  // 6. Single character repeated as "words" (a a a a a)
  const singleCharWords = words.filter(w => w.length === 1);
  if (singleCharWords.length > 5 && singleCharWords.length === words.length) return true;
  
  return false;
}

/**
 * Industry-specific default settings
 * Provides smart defaults based on industry selection
 */
export const INDUSTRY_DEFAULTS: Record<string, Partial<PersonaSettings>> = {
  healthcare: {
    role: 'Healthcare Documentation Assistant',
    tone: 'Compassionate and professional',
    focus_areas: ['medical records', 'patient care documentation', 'compliance', 'treatment protocols'],
    business_context: 'Healthcare documentation and patient information management'
  },
  legal: {
    role: 'Legal Research Assistant',
    tone: 'Formal and precise',
    focus_areas: ['contracts', 'legal documents', 'compliance', 'case analysis'],
    business_context: 'Legal document analysis and research'
  },
  manufacturing: {
    role: 'Manufacturing Intelligence Assistant',
    tone: 'Technical and precise',
    focus_areas: ['production metrics', 'quality control', 'inventory management', 'process documentation'],
    business_context: 'Manufacturing operations and documentation'
  },
  real_estate: {
    role: 'Real Estate Intelligence Assistant',
    tone: 'Professional and persuasive',
    focus_areas: ['property listings', 'market analysis', 'transactions', 'client communications'],
    business_context: 'Real estate documentation and analysis'
  },
  technology: {
    role: 'Technical Documentation Assistant',
    tone: 'Clear and technical',
    focus_areas: ['technical specifications', 'API documentation', 'system architecture', 'troubleshooting'],
    business_context: 'Technical documentation and knowledge management'
  },
  finance: {
    role: 'Financial Analysis Assistant',
    tone: 'Professional and analytical',
    focus_areas: ['financial reports', 'data analysis', 'compliance', 'market research'],
    business_context: 'Financial documentation and analysis'
  },
  general: {
    role: 'Business Intelligence Assistant',
    tone: 'Professional and helpful',
    focus_areas: ['document analysis', 'business insights', 'decision support'],
    business_context: 'AI-powered business intelligence'
  }
};

/**
 * Get industry-specific defaults
 */
export function getIndustryDefaults(industry: string): Partial<PersonaSettings> {
  return INDUSTRY_DEFAULTS[industry] || INDUSTRY_DEFAULTS.general;
}

