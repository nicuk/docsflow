/**
 * Persona Prompt Generator
 * Generates optimized RAG prompts from simplified persona settings:
 *   - Industry (dropdown with presets)
 *   - Custom Instructions (free-form textarea)
 */

export interface PersonaSettings {
  industry: string;
  custom_instructions: string;
}

interface GeneratedPrompts {
  system_prompt: string;
  fallback_prompt: string;
}

const RAG_GUARDRAILS = `CORE RAG INSTRUCTIONS:
1. ONLY use information explicitly stated in the provided document context
2. If documents don't contain the answer, clearly state "I don't have that information in the available documents"
3. NEVER fabricate information, specifications, numbers, dates, or details
4. When uncertain about any detail, ask the user to provide more specific documents
5. ALWAYS cite which document(s) your answer comes from

RESPONSE GUIDELINES:
- Be accurate and source every factual claim
- Indicate confidence level in your responses
- Suggest relevant follow-up questions when appropriate
- If the query is unclear, politely ask for clarification

NEVER DO:
- Make up information not in documents
- Provide specifications or numbers without source
- Guess at answers when documents don't contain them
- Mix information from different contexts without attribution`;

export function generateSystemPrompt(settings: PersonaSettings): string {
  const { industry, custom_instructions } = settings;
  const preset = INDUSTRY_PRESETS[industry] || INDUSTRY_PRESETS.general;

  const instructions = custom_instructions?.trim() || preset.default_instructions;

  return `${instructions}

${RAG_GUARDRAILS}`;
}

export function generateFallbackPrompt(settings: PersonaSettings): string {
  const preset = INDUSTRY_PRESETS[settings.industry] || INDUSTRY_PRESETS.general;

  return `I'm not sure I understood your question correctly. I'm a document intelligence assistant specialized in ${preset.label.toLowerCase()}.

Could you please rephrase your question? For example:
- "What information is in [document name]?"
- "Summarize the key points from my documents"
- "What does the data show about [specific topic]?"`;
}

export function generatePersonaPrompts(settings: PersonaSettings): GeneratedPrompts {
  return {
    system_prompt: generateSystemPrompt(settings),
    fallback_prompt: generateFallbackPrompt(settings)
  };
}

export function getDefaultPersona(): PersonaSettings & GeneratedPrompts {
  const defaultSettings: PersonaSettings = {
    industry: 'general',
    custom_instructions: INDUSTRY_PRESETS.general.default_instructions
  };

  const prompts = generatePersonaPrompts(defaultSettings);

  return {
    ...defaultSettings,
    ...prompts
  };
}

export function validatePersonaSettings(settings: Partial<PersonaSettings>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (settings.custom_instructions && settings.custom_instructions.length > 2000) {
    errors.push('Custom instructions must be under 2000 characters');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Detect if a query is gibberish or unclear
 */
export function detectGibberish(query: string): boolean {
  if (!query || typeof query !== 'string') return true;

  const trimmed = query.trim();

  if (trimmed.length < 3) return true;

  const alphanumeric = trimmed.match(/[a-zA-Z0-9]/g) || [];
  if (alphanumeric.length / trimmed.length < 0.3) return true;

  const repeatedPattern = /(.)\1{7,}/;
  if (repeatedPattern.test(trimmed)) return true;

  const words = trimmed.split(/\s+/);
  const longWords = words.filter(w => w.length > 3);
  if (longWords.length > 0) {
    const wordsWithVowels = longWords.filter(w => /[aeiouAEIOU]/.test(w));
    if (wordsWithVowels.length / longWords.length < 0.4) return true;
  }

  const specialCharsPattern = /[^a-zA-Z0-9\s]{5,}/;
  if (specialCharsPattern.test(trimmed)) return true;

  const singleCharWords = words.filter(w => w.length === 1);
  if (singleCharWords.length > 5 && singleCharWords.length === words.length) return true;

  return false;
}

export interface IndustryPreset {
  label: string;
  default_instructions: string;
}

export const INDUSTRY_PRESETS: Record<string, IndustryPreset> = {
  general: {
    label: 'General Business',
    default_instructions: 'You are a document intelligence assistant. Provide clear, accurate answers based on uploaded documents with proper source attribution. Focus on extracting actionable insights and summarizing key information.'
  },
  healthcare: {
    label: 'Healthcare',
    default_instructions: 'You are a healthcare documentation assistant. Provide compassionate, professional responses focused on medical records, patient care documentation, compliance requirements, and treatment protocols. Always prioritize accuracy with clinical terminology.'
  },
  legal: {
    label: 'Legal',
    default_instructions: 'You are a legal research assistant. Provide formal, precise responses focused on contracts, legal documents, compliance requirements, and case analysis. Use appropriate legal terminology and always cite specific document sections.'
  },
  manufacturing: {
    label: 'Manufacturing',
    default_instructions: 'You are a manufacturing intelligence assistant. Provide technical, precise responses focused on production metrics, quality control, inventory management, and process documentation. Emphasize data accuracy and operational efficiency.'
  },
  real_estate: {
    label: 'Real Estate',
    default_instructions: 'You are a real estate intelligence assistant. Provide professional responses focused on property listings, market analysis, transaction documents, and client communications. Emphasize accuracy in financial figures and property details.'
  },
  technology: {
    label: 'Technology',
    default_instructions: 'You are a technical documentation assistant. Provide clear, technical responses focused on specifications, API documentation, system architecture, and troubleshooting guides. Use appropriate technical terminology.'
  },
  finance: {
    label: 'Finance',
    default_instructions: 'You are a financial analysis assistant. Provide professional, analytical responses focused on financial reports, data analysis, compliance documents, and market research. Emphasize precision with numbers and regulatory accuracy.'
  }
};

export function getIndustryPreset(industry: string): IndustryPreset {
  return INDUSTRY_PRESETS[industry] || INDUSTRY_PRESETS.general;
}
